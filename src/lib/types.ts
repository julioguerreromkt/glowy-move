export const MUSCLE_GROUPS = [
  'Peito',
  'Costas',
  'Ombros',
  'Bíceps',
  'Tríceps',
  'Quadríceps',
  'Glúteos e posterior',
  'Core',
  'Panturrilhas',
] as const;

export type MuscleGroup = (typeof MUSCLE_GROUPS)[number];

export const DIFFICULTIES = ['Iniciante', 'Intermediário', 'Avançado'] as const;
export type Difficulty = (typeof DIFFICULTIES)[number];

export const ANALYSIS_PROFILES = ['squat', 'pushup', 'curl', 'lunge'] as const;
export type AnalysisProfile = (typeof ANALYSIS_PROFILES)[number];

export const CAMERA_VIEWS = ['Lateral', 'Frontal', 'Frontal ou lateral'] as const;
export type CameraView = (typeof CAMERA_VIEWS)[number];

export interface Exercise {
  id: string;
  name: string;
  muscleGroup: MuscleGroup;
  secondaryMuscles: string[];
  equipment: string;
  difficulty: Difficulty;
  motion: string;
  description: string;
  steps: [string, string, string];
  commonMistake: string;
  analyzable: boolean;
  analysisProfile: AnalysisProfile | null;
  cameraView: CameraView;
  sortOrder: number;
  videoId: string;
  videoSource: string;
  videoUrl: string;
}

/** Ângulo de câmera efetivamente escolhido pela pessoa para gravar. */
export type ShotView = 'Lateral' | 'Frontal';

export interface AnalysisProfileMeta {
  profile: AnalysisProfile;
  code: string;
  label: string;
  shortLabel: string;
  /** Ângulos de câmera aceitos por este perfil. */
  views: ShotView[];
  /** Exercício da biblioteca usado como execução de referência. */
  referenceExerciseId: string;
  /** Vocabulário do ciclo: repetição para exercícios estacionários, passada para o afundo. */
  cycleNoun: 'repeticao' | 'passada';
}
