import type { AnalysisProfile, ShotView } from '@/lib/types';

export interface PoseLandmarkPoint {
  x: number;
  y: number;
  z?: number;
  visibility?: number;
}

/** Um quadro amostrado do vídeo, sempre com os 33 pontos normalizados. */
export interface PoseFrame {
  /** Tempo do quadro no vídeo, em segundos. */
  t: number;
  landmarks: PoseLandmarkPoint[];
}

export interface FrameMetrics {
  t: number;
  quality: number;
  elbowAngle: number;
  kneeAngle: number;
  torsoLean: number;
  bodyLineDeviation: number;
  elbowDrift: number;
  kneeAnkleDrift: number;
}

export type FindingSeverity = 'atencao' | 'ajuste';
export type FindingConfidence = 'Alta' | 'Boa' | 'Limitada';

export interface Finding {
  id: string;
  title: string;
  detail: string;
  cue: string;
  severity: FindingSeverity;
  confidence: FindingConfidence;
  /** Número do ciclo, começando em 1. */
  cycleNumber: number;
  /** Momento no vídeo, em segundos. */
  timestamp: number;
}

export interface CycleResult {
  number: number;
  startSec: number;
  bottomSec: number;
  endSec: number;
  durationSec: number;
  /** Menor ângulo da articulação que dirige o ciclo. */
  minAngle: number;
  quality: number;
  score: number;
  findings: Finding[];
}

export interface AnalysisResult {
  profile: AnalysisProfile;
  view: ShotView;
  cycles: CycleResult[];
  findings: Finding[];
  consistency: number;
  sampledFrames: number;
  validFrames: number;
  averageQuality: number;
  /** Verdadeiro quando nenhum desvio relevante foi encontrado. */
  consistent: boolean;
  durationSec: number;
  frames: PoseFrame[];
}

export type AnalysisErrorCode =
  | 'ARQUIVO_INVALIDO'
  | 'ARQUIVO_GRANDE'
  | 'VIDEO_LONGO'
  | 'ARTICULACOES_POUCO_VISIVEIS'
  | 'SEM_CICLO'
  | 'NAVEGADOR_INCOMPATIVEL'
  | 'FALHA_PROCESSAMENTO';

export class AnalysisError extends Error {
  code: AnalysisErrorCode;
  hint?: string;
  constructor(code: AnalysisErrorCode, message: string, hint?: string) {
    super(message);
    this.name = 'AnalysisError';
    this.code = code;
    this.hint = hint;
  }
}
