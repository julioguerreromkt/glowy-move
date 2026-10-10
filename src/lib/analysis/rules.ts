import type { AnalysisProfile, ShotView } from '@/lib/types';
import { FAST_TEMPO_SECONDS, RULE_THRESHOLDS } from './constants';
import type { DetectedCycle } from './cycles';
import type { Finding, FindingConfidence, FrameMetrics } from './types';

export function formatNumber(value: number, digits = 0): string {
  if (!Number.isFinite(value)) return 'indisponível';
  return value.toFixed(digits).replace('.', ',');
}

export function confidenceFromQuality(quality: number): FindingConfidence {
  if (quality >= 0.72) return 'Alta';
  if (quality >= 0.5) return 'Boa';
  return 'Limitada';
}

function sliceOf(metrics: FrameMetrics[], cycle: DetectedCycle): FrameMetrics[] {
  return metrics.slice(cycle.startIndex, cycle.endIndex + 1);
}

function maxOf(slice: FrameMetrics[], key: keyof FrameMetrics): number {
  let best = Number.NEGATIVE_INFINITY;
  for (const m of slice) {
    const v = m[key] as number;
    if (Number.isFinite(v) && v > best) best = v;
  }
  return Number.isFinite(best) ? best : Number.NaN;
}

function meanQuality(slice: FrameMetrics[]): number {
  const values = slice.map((m) => m.quality).filter((v) => Number.isFinite(v));
  if (!values.length) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

interface RuleContext {
  profile: AnalysisProfile;
  view: ShotView;
  cycle: DetectedCycle;
  cycleNumber: number;
  slice: FrameMetrics[];
  confidence: FindingConfidence;
}

type RuleFactory = (ctx: RuleContext) => Finding | null;

function make(
  ctx: RuleContext,
  id: string,
  title: string,
  detail: string,
  cue: string,
  severity: Finding['severity'],
  timestamp: number,
): Finding {
  return {
    id: `${ctx.cycleNumber}-${id}`,
    title,
    detail,
    cue,
    severity,
    confidence: ctx.confidence,
    cycleNumber: ctx.cycleNumber,
    timestamp,
  };
}

const squatRules: RuleFactory[] = [
  (ctx) => {
    const t = RULE_THRESHOLDS.squat.shallowKnee;
    if (!(ctx.cycle.minAngle > t)) return null;
    return make(
      ctx,
      'amplitude',
      'Amplitude parcial',
      `O joelho parou em ${formatNumber(ctx.cycle.minAngle, 1)}°, acima da referência de ${formatNumber(t)}° usada para considerar a descida completa.`,
      'Desça mais devagar até onde consegue manter os pés inteiros no chão e o tronco estável. Ganhar profundidade vem antes de ganhar carga.',
      'ajuste',
      ctx.cycle.bottomSec,
    );
  },
  (ctx) => {
    if (ctx.view !== 'Lateral') return null;
    const t = RULE_THRESHOLDS.squat.torsoLean;
    const lean = maxOf(ctx.slice, 'torsoLean');
    if (!(lean > t)) return null;
    return make(
      ctx,
      'tronco',
      'Tronco bem inclinado',
      `A inclinação máxima do tronco foi de ${formatNumber(lean, 1)}°, acima dos ${formatNumber(t)}° de referência para esta vista.`,
      'Pense em descer entre os pés, não para frente. Um leve calço embaixo dos calcanhares costuma ajudar quem tem tornozelo travado.',
      'atencao',
      ctx.cycle.bottomSec,
    );
  },
  (ctx) => {
    if (ctx.view !== 'Frontal') return null;
    const t = RULE_THRESHOLDS.squat.kneeAnkleDrift;
    const drift = maxOf(ctx.slice, 'kneeAnkleDrift');
    if (!(drift > t)) return null;
    return make(
      ctx,
      'joelho-tornozelo',
      'Joelho fora da linha do pé',
      `O desvio entre joelho e tornozelo chegou a ${formatNumber(drift, 2)} da largura do quadril, acima da referência de ${formatNumber(t, 2)}.`,
      'Empurre os joelhos na direção dos dedos dos pés durante a subida. Filmar de frente ajuda a comparar os dois lados.',
      'atencao',
      ctx.cycle.bottomSec,
    );
  },
];

const pushupRules: RuleFactory[] = [
  (ctx) => {
    const t = RULE_THRESHOLDS.pushup.bodyLine;
    const dev = maxOf(ctx.slice, 'bodyLineDeviation');
    if (!(dev > t)) return null;
    return make(
      ctx,
      'linha-corpo',
      'Quadril fora da linha',
      `O desvio da linha ombro, quadril e tornozelo chegou a ${formatNumber(dev, 1)}°, acima dos ${formatNumber(t)}° de referência.`,
      'Ative glúteo e abdômen antes de descer e mantenha as costelas fechadas. Se cansar, apoie os joelhos e preserve a linha.',
      'atencao',
      ctx.cycle.bottomSec,
    );
  },
  (ctx) => {
    const t = RULE_THRESHOLDS.pushup.shortRange;
    if (!(ctx.cycle.minAngle > t)) return null;
    return make(
      ctx,
      'amplitude',
      'Amplitude curta',
      `O cotovelo parou em ${formatNumber(ctx.cycle.minAngle, 1)}°, sem passar da referência de ${formatNumber(t)}°.`,
      'Reduza a altura do apoio das mãos ou o número de repetições e desça mais, mantendo a linha do corpo.',
      'ajuste',
      ctx.cycle.bottomSec,
    );
  },
];

const curlRules: RuleFactory[] = [
  (ctx) => {
    const t = RULE_THRESHOLDS.curl.elbowDrift;
    const drift = maxOf(ctx.slice, 'elbowDrift');
    if (!(drift > t)) return null;
    return make(
      ctx,
      'cotovelo',
      'Cotovelos avançando',
      `O cotovelo se afastou do tronco em até ${formatNumber(drift, 1)}°, acima dos ${formatNumber(t)}° de referência.`,
      'Encoste os braços nas costelas e suba só o antebraço. Se o cotovelo insiste em ir para frente, a carga está alta.',
      'atencao',
      ctx.cycle.bottomSec,
    );
  },
  (ctx) => {
    const t = RULE_THRESHOLDS.curl.incompleteFlexion;
    if (!(ctx.cycle.minAngle > t)) return null;
    return make(
      ctx,
      'flexao',
      'Flexão incompleta',
      `O menor ângulo do cotovelo foi ${formatNumber(ctx.cycle.minAngle, 1)}°, acima da referência de ${formatNumber(t)}°.`,
      'Leve o punho mais perto do ombro no fim da subida, sem jogar o tronco para trás.',
      'ajuste',
      ctx.cycle.bottomSec,
    );
  },
];

const lungeRules: RuleFactory[] = [
  (ctx) => {
    const t = RULE_THRESHOLDS.lunge.shallowKnee;
    if (!(ctx.cycle.minAngle > t)) return null;
    return make(
      ctx,
      'profundidade',
      'Passada pouco profunda',
      `O joelho da frente parou em ${formatNumber(ctx.cycle.minAngle, 1)}°, acima da referência de ${formatNumber(t)}°.`,
      'Dê um passo um pouco maior e deixe o joelho de trás descer na direção do chão, sem tocar.',
      'ajuste',
      ctx.cycle.bottomSec,
    );
  },
  (ctx) => {
    const t = RULE_THRESHOLDS.lunge.torsoLean;
    const lean = maxOf(ctx.slice, 'torsoLean');
    if (!(lean > t)) return null;
    return make(
      ctx,
      'tronco',
      'Tronco inclinado demais',
      `A inclinação máxima do tronco foi de ${formatNumber(lean, 1)}°, acima dos ${formatNumber(t)}° de referência.`,
      'Olhe para um ponto fixo à frente e mantenha o peito alto durante a troca de perna.',
      'atencao',
      ctx.cycle.bottomSec,
    );
  },
];

const RULES: Record<AnalysisProfile, RuleFactory[]> = {
  squat: squatRules,
  pushup: pushupRules,
  curl: curlRules,
  lunge: lungeRules,
};

function tempoRule(ctx: RuleContext): Finding | null {
  const limit = ctx.profile === 'lunge' ? FAST_TEMPO_SECONDS.lunge : FAST_TEMPO_SECONDS.stationary;
  if (!(ctx.cycle.durationSec < limit)) return null;
  const noun = ctx.profile === 'lunge' ? 'passada' : 'repetição';
  return make(
    ctx,
    'ritmo',
    'Ritmo acelerado',
    `Esta ${noun} durou ${formatNumber(ctx.cycle.durationSec, 2)} s, abaixo dos ${formatNumber(limit, 2)} s de referência.`,
    'Conte dois tempos na descida e um na subida. Ritmo mais lento costuma melhorar o controle antes de aumentar a carga.',
    'ajuste',
    ctx.cycle.startSec,
  );
}

export function findingsForCycle(
  profile: AnalysisProfile,
  view: ShotView,
  metrics: FrameMetrics[],
  cycle: DetectedCycle,
  cycleNumber: number,
): { findings: Finding[]; quality: number } {
  const slice = sliceOf(metrics, cycle);
  const quality = meanQuality(slice);
  const ctx: RuleContext = {
    profile,
    view,
    cycle,
    cycleNumber,
    slice,
    confidence: confidenceFromQuality(quality),
  };
  const findings = [...RULES[profile].map((rule) => rule(ctx)), tempoRule(ctx)].filter(
    (f): f is Finding => f !== null,
  );
  return { findings, quality };
}
