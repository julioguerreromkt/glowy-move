import type { AnalysisProfile } from '@/lib/types';

/** Amostragem do vídeo, em quadros por segundo. */
export const SAMPLE_FPS = 10;

/** Limites de arquivo aceitos no upload. */
export const MAX_VIDEO_BYTES = 250 * 1024 * 1024;
export const MAX_VIDEO_SECONDS = 45;

/** Qualidade mínima de um quadro (visibilidade média das articulações do perfil). */
export const FRAME_QUALITY_MIN = 0.32;
/** Quantidade mínima de quadros válidos: o maior entre 12 e 35% do amostrado. */
export const MIN_VALID_FRAMES_ABS = 12;
export const MIN_VALID_FRAMES_RATIO = 0.35;

/** Raio da média móvel aplicada à série de ângulos. */
export const SMOOTHING_RADIUS = 2;

/** Teto de ciclos reportados. */
export const MAX_CYCLES = 20;

/** Configuração do PoseLandmarker. */
export const POSE_LANDMARKER_OPTIONS = {
  numPoses: 1,
  minPoseDetectionConfidence: 0.48,
  minPosePresenceConfidence: 0.48,
  minTrackingConfidence: 0.48,
} as const;

export interface HysteresisConfig {
  kind: 'hysteresis';
  /** Articulação que dirige a segmentação. */
  joint: 'elbow' | 'knee';
  /** Acima deste ângulo o corpo está no estado alto. */
  highAngle: number;
  /** Abaixo deste ângulo começa a descida. */
  lowAngle: number;
  minCycleSeconds: number;
}

export interface ValleyConfig {
  kind: 'valley';
  joint: 'knee';
  percentileLow: number;
  percentileHigh: number;
  /** Amplitude observada mínima para a sequência ser considerada movimento. */
  minAmplitude: number;
  /** Fundo da passada: low + ratio * amplitude. */
  bottomRatio: number;
  minSeparationSeconds: number;
  prominenceAbs: number;
  prominenceRatio: number;
  minCycleSeconds: number;
  maxCycleSeconds: number;
}

export type CycleConfig = HysteresisConfig | ValleyConfig;

export const CYCLE_CONFIG: Record<AnalysisProfile, CycleConfig> = {
  squat: { kind: 'hysteresis', joint: 'knee', highAngle: 158, lowAngle: 132, minCycleSeconds: 0.65 },
  pushup: { kind: 'hysteresis', joint: 'elbow', highAngle: 148, lowAngle: 112, minCycleSeconds: 0.65 },
  curl: { kind: 'hysteresis', joint: 'elbow', highAngle: 135, lowAngle: 92, minCycleSeconds: 0.65 },
  lunge: {
    kind: 'valley',
    joint: 'knee',
    percentileLow: 0.15,
    percentileHigh: 0.85,
    minAmplitude: 12,
    bottomRatio: 0.46,
    minSeparationSeconds: 0.55,
    prominenceAbs: 8,
    prominenceRatio: 0.24,
    minCycleSeconds: 0.45,
    maxCycleSeconds: 4,
  },
};

/** Limiares das regras de feedback, por perfil. */
export const RULE_THRESHOLDS = {
  squat: { shallowKnee: 112, torsoLean: 38, kneeAnkleDrift: 0.2 },
  pushup: { bodyLine: 13, shortRange: 105 },
  curl: { elbowDrift: 27, incompleteFlexion: 90 },
  lunge: { shallowKnee: 122, torsoLean: 42 },
} as const;

/** Ritmo acelerado: duração de ciclo abaixo destes valores, em segundos. */
export const FAST_TEMPO_SECONDS = {
  stationary: 1.05,
  lunge: 0.65,
} as const;

/** Score por ciclo: clamp(round(96 - 11 * alertas), 58, 98). */
export const SCORE_BASE = 96;
export const SCORE_PENALTY = 11;
export const SCORE_MIN = 58;
export const SCORE_MAX = 98;
