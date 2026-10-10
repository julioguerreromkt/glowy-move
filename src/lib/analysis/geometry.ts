import type { AnalysisProfile } from '@/lib/types';
import type { FrameMetrics, PoseFrame, PoseLandmarkPoint } from './types';

/** Índices dos pontos do PoseLandmarker usados pelo produto. */
export const LM = {
  nose: 0,
  leftShoulder: 11,
  rightShoulder: 12,
  leftElbow: 13,
  rightElbow: 14,
  leftWrist: 15,
  rightWrist: 16,
  leftHip: 23,
  rightHip: 24,
  leftKnee: 25,
  rightKnee: 26,
  leftAnkle: 27,
  rightAnkle: 28,
} as const;

/** Pares desenhados no overlay de esqueleto. */
export const SKELETON_EDGES: Array<[number, number]> = [
  [11, 12],
  [11, 13],
  [13, 15],
  [12, 14],
  [14, 16],
  [11, 23],
  [12, 24],
  [23, 24],
  [23, 25],
  [25, 27],
  [24, 26],
  [26, 28],
];

/** Articulações que pesam na qualidade do quadro, por perfil. */
export const RELEVANT_JOINTS: Record<AnalysisProfile, number[]> = {
  squat: [11, 12, 23, 24, 25, 26, 27, 28],
  pushup: [11, 12, 13, 14, 15, 16, 23, 24, 27, 28],
  curl: [11, 12, 13, 14, 15, 16, 23, 24],
  lunge: [11, 12, 23, 24, 25, 26, 27, 28],
};

interface Point2D {
  x: number;
  y: number;
}

/** Converte o ponto normalizado em coordenadas quadradas, corrigindo o aspecto. */
function toSquare(p: PoseLandmarkPoint, aspect: number): Point2D {
  return { x: p.x * aspect, y: p.y };
}

function visible(p: PoseLandmarkPoint | undefined, min = 0.3): p is PoseLandmarkPoint {
  return !!p && Number.isFinite(p.x) && Number.isFinite(p.y) && (p.visibility ?? 1) >= min;
}

function mid(a: Point2D, b: Point2D): Point2D {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

/** Ângulo em B, no trecho A-B-C, em graus. */
export function angleAt(a: Point2D, b: Point2D, c: Point2D): number {
  const v1x = a.x - b.x;
  const v1y = a.y - b.y;
  const v2x = c.x - b.x;
  const v2y = c.y - b.y;
  const n1 = Math.hypot(v1x, v1y);
  const n2 = Math.hypot(v2x, v2y);
  if (n1 < 1e-6 || n2 < 1e-6) return Number.NaN;
  const cos = Math.min(1, Math.max(-1, (v1x * v2x + v1y * v2y) / (n1 * n2)));
  return (Math.acos(cos) * 180) / Math.PI;
}

/** Inclinação de um segmento em relação à vertical da imagem, em graus. */
export function leanFromVertical(from: Point2D, to: Point2D): number {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const n = Math.hypot(dx, dy);
  if (n < 1e-6) return Number.NaN;
  const cos = Math.min(1, Math.max(-1, Math.abs(dy) / n));
  return (Math.acos(cos) * 180) / Math.PI;
}

function meanOfFinite(values: number[]): number {
  const ok = values.filter((v) => Number.isFinite(v));
  if (!ok.length) return Number.NaN;
  return ok.reduce((a, b) => a + b, 0) / ok.length;
}

/** Visibilidade média das articulações relevantes do perfil. */
export function frameQuality(frame: PoseFrame, profile: AnalysisProfile): number {
  const joints = RELEVANT_JOINTS[profile];
  const values = joints.map((i) => {
    const p = frame.landmarks[i];
    if (!p || !Number.isFinite(p.x) || !Number.isFinite(p.y)) return 0;
    return typeof p.visibility === 'number' ? p.visibility : 1;
  });
  if (!values.length) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

/**
 * Deriva as medidas de um quadro. `aspect` é largura/altura do vídeo e existe
 * para que ângulos não fiquem distorcidos por coordenadas normalizadas.
 */
export function computeFrameMetrics(frame: PoseFrame, profile: AnalysisProfile, aspect: number): FrameMetrics {
  const l = frame.landmarks;
  const g = (i: number) => (visible(l[i]) ? toSquare(l[i], aspect) : null);

  const ls = g(LM.leftShoulder);
  const rs = g(LM.rightShoulder);
  const le = g(LM.leftElbow);
  const re = g(LM.rightElbow);
  const lw = g(LM.leftWrist);
  const rw = g(LM.rightWrist);
  const lh = g(LM.leftHip);
  const rh = g(LM.rightHip);
  const lk = g(LM.leftKnee);
  const rk = g(LM.rightKnee);
  const la = g(LM.leftAnkle);
  const ra = g(LM.rightAnkle);

  const elbowAngle = meanOfFinite([
    ls && le && lw ? angleAt(ls, le, lw) : Number.NaN,
    rs && re && rw ? angleAt(rs, re, rw) : Number.NaN,
  ]);

  const kneeAngle = meanOfFinite([
    lh && lk && la ? angleAt(lh, lk, la) : Number.NaN,
    rh && rk && ra ? angleAt(rh, rk, ra) : Number.NaN,
  ]);

  const shoulderMid = ls && rs ? mid(ls, rs) : (ls ?? rs);
  const hipMid = lh && rh ? mid(lh, rh) : (lh ?? rh);
  const ankleMid = la && ra ? mid(la, ra) : (la ?? ra);

  const torsoLean = shoulderMid && hipMid ? leanFromVertical(hipMid, shoulderMid) : Number.NaN;

  const bodyLineDeviation =
    shoulderMid && hipMid && ankleMid ? 180 - angleAt(shoulderMid, hipMid, ankleMid) : Number.NaN;

  const elbowDrift = meanOfFinite([
    ls && lh && le ? angleAt(lh, ls, le) : Number.NaN,
    rs && rh && re ? angleAt(rh, rs, re) : Number.NaN,
  ]);

  let kneeAnkleDrift = Number.NaN;
  if (lh && rh) {
    const hipWidth = Math.hypot(lh.x - rh.x, lh.y - rh.y);
    if (hipWidth > 0.02) {
      kneeAnkleDrift = meanOfFinite([
        lk && la ? Math.abs(lk.x - la.x) / hipWidth : Number.NaN,
        rk && ra ? Math.abs(rk.x - ra.x) / hipWidth : Number.NaN,
      ]);
    }
  }

  return {
    t: frame.t,
    quality: frameQuality(frame, profile),
    elbowAngle,
    kneeAngle,
    torsoLean,
    bodyLineDeviation,
    elbowDrift,
    kneeAnkleDrift,
  };
}
