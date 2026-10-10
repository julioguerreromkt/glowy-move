import type { AnalysisProfile, ShotView } from '@/lib/types';
import {
  CYCLE_CONFIG,
  FRAME_QUALITY_MIN,
  MIN_VALID_FRAMES_ABS,
  MIN_VALID_FRAMES_RATIO,
  SCORE_BASE,
  SCORE_MAX,
  SCORE_MIN,
  SCORE_PENALTY,
  SMOOTHING_RADIUS,
} from './constants';
import { detectCycles } from './cycles';
import { computeFrameMetrics } from './geometry';
import { findingsForCycle } from './rules';
import { clamp, interpolateGaps, movingAverage } from './signal';
import { AnalysisError, type AnalysisResult, type CycleResult, type Finding, type PoseFrame } from './types';

export function scoreForFindings(count: number): number {
  return clamp(Math.round(SCORE_BASE - SCORE_PENALTY * count), SCORE_MIN, SCORE_MAX);
}

export function minimumValidFrames(sampled: number): number {
  return Math.max(MIN_VALID_FRAMES_ABS, Math.ceil(sampled * MIN_VALID_FRAMES_RATIO));
}

export interface AnalyzeInput {
  profile: AnalysisProfile;
  view: ShotView;
  frames: PoseFrame[];
  /** largura / altura do vídeo, para corrigir o aspecto das coordenadas. */
  aspect: number;
  durationSec: number;
}

const NO_CYCLE_HINT: Record<AnalysisProfile, string> = {
  squat: 'Grave de 3 a 8 repetições com o corpo inteiro no quadro, começando e terminando de pé.',
  pushup: 'Grave de 3 a 8 repetições de perfil, com ombros, quadril e tornozelos visíveis.',
  curl: 'Grave de 3 a 8 repetições de perfil, com ombro, cotovelo e punho visíveis.',
  lunge:
    'Grave ao menos uma descida e uma subida lateral com as pernas inteiras no quadro. Não é preciso voltar à posição neutra nem ao mesmo lugar.',
};

/**
 * Recebe os quadros já mapeados e devolve o resultado da análise.
 * Nenhuma etapa aqui depende de rede: é matemática sobre os pontos da pose.
 */
export function analyzeFrames(input: AnalyzeInput): AnalysisResult {
  const { profile, view, frames, aspect, durationSec } = input;
  const sampledFrames = frames.length;

  const metrics = frames.map((frame) => computeFrameMetrics(frame, profile, aspect));
  const validMetrics = metrics.filter((m) => m.quality > FRAME_QUALITY_MIN);
  const required = minimumValidFrames(sampledFrames);

  if (validMetrics.length < required) {
    throw new AnalysisError(
      'ARTICULACOES_POUCO_VISIVEIS',
      'Não deu para acompanhar as articulações neste vídeo.',
      'Enquadre o corpo inteiro, melhore a luz e mantenha a câmera parada no ângulo escolhido.',
    );
  }

  const config = CYCLE_CONFIG[profile];
  const times = validMetrics.map((m) => m.t);
  const rawAngles = validMetrics.map((m) => (config.joint === 'knee' ? m.kneeAngle : m.elbowAngle));
  const smoothed = movingAverage(interpolateGaps(rawAngles), SMOOTHING_RADIUS);

  const detected = detectCycles(times, smoothed, config);
  if (!detected.length) {
    throw new AnalysisError('SEM_CICLO', 'Não identifiquei nenhum ciclo completo neste vídeo.', NO_CYCLE_HINT[profile]);
  }

  const cycles: CycleResult[] = detected.map((cycle, index) => {
    const number = index + 1;
    const { findings, quality } = findingsForCycle(profile, view, validMetrics, cycle, number);
    return {
      number,
      startSec: cycle.startSec,
      bottomSec: cycle.bottomSec,
      endSec: cycle.endSec,
      durationSec: cycle.durationSec,
      minAngle: cycle.minAngle,
      quality,
      score: scoreForFindings(findings.length),
      findings,
    };
  });

  const findings: Finding[] = cycles.flatMap((c) => c.findings);
  const consistency = Math.round(cycles.reduce((sum, c) => sum + c.score, 0) / cycles.length);
  const averageQuality = validMetrics.reduce((sum, m) => sum + m.quality, 0) / validMetrics.length;

  return {
    profile,
    view,
    cycles,
    findings,
    consistency,
    sampledFrames,
    validFrames: validMetrics.length,
    averageQuality,
    consistent: findings.length === 0,
    durationSec,
    frames,
  };
}
