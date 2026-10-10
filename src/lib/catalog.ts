import raw from '@/data/catalog.json';
import {
  ANALYSIS_PROFILES,
  CAMERA_VIEWS,
  DIFFICULTIES,
  MUSCLE_GROUPS,
  type AnalysisProfile,
  type AnalysisProfileMeta,
  type CameraView,
  type Difficulty,
  type Exercise,
  type MuscleGroup,
} from '@/lib/types';

function fail(message: string): never {
  throw new Error(`[catálogo] ${message}`);
}

function parseExercise(value: unknown, index: number): Exercise {
  if (typeof value !== 'object' || value === null) fail(`registro ${index} não é um objeto`);
  const raw = value as Record<string, unknown>;
  const at = (key: string) => `registro ${index} (${String(raw.id ?? 'sem id')}) campo ${key}`;

  const str = (key: string): string => {
    const v = raw[key];
    if (typeof v !== 'string' || v.trim() === '') fail(`${at(key)} precisa ser texto não vazio`);
    return v;
  };

  const muscleGroup = str('muscleGroup');
  if (!(MUSCLE_GROUPS as readonly string[]).includes(muscleGroup)) fail(`${at('muscleGroup')} fora do canônico`);

  const difficulty = str('difficulty');
  if (!(DIFFICULTIES as readonly string[]).includes(difficulty)) fail(`${at('difficulty')} fora do canônico`);

  const cameraView = str('cameraView');
  if (!(CAMERA_VIEWS as readonly string[]).includes(cameraView)) fail(`${at('cameraView')} fora do canônico`);

  const profile = raw.analysisProfile;
  if (profile !== null && (typeof profile !== 'string' || !(ANALYSIS_PROFILES as readonly string[]).includes(profile))) {
    fail(`${at('analysisProfile')} precisa ser squat, pushup, curl, lunge ou null`);
  }

  const analyzable = raw.analyzable;
  if (typeof analyzable !== 'boolean') fail(`${at('analyzable')} precisa ser booleano`);
  if (analyzable !== (profile !== null)) fail(`${at('analyzable')} não bate com analysisProfile`);

  const secondary = raw.secondaryMuscles;
  if (!Array.isArray(secondary) || secondary.some((m) => typeof m !== 'string')) {
    fail(`${at('secondaryMuscles')} precisa ser lista de texto`);
  }

  const steps = raw.steps;
  if (!Array.isArray(steps) || steps.length !== 3 || steps.some((s) => typeof s !== 'string' || s.trim() === '')) {
    fail(`${at('steps')} precisa ter exatamente 3 passos`);
  }

  const sortOrder = raw.sortOrder;
  if (typeof sortOrder !== 'number' || !Number.isFinite(sortOrder)) fail(`${at('sortOrder')} precisa ser número`);

  const videoId = str('videoId');
  const videoUrl = str('videoUrl');
  if (!videoUrl.includes(videoId)) fail(`${at('videoUrl')} não contém o videoId`);

  return {
    id: str('id'),
    name: str('name'),
    muscleGroup: muscleGroup as MuscleGroup,
    secondaryMuscles: secondary as string[],
    equipment: str('equipment'),
    difficulty: difficulty as Difficulty,
    motion: str('motion'),
    description: str('description'),
    steps: steps as [string, string, string],
    commonMistake: str('commonMistake'),
    analyzable,
    analysisProfile: (profile as AnalysisProfile | null) ?? null,
    cameraView: cameraView as CameraView,
    sortOrder,
    videoId,
    videoSource: str('videoSource'),
    videoUrl,
  };
}

function buildCatalog(): Exercise[] {
  const list = (raw as { exerciseCatalog: unknown[] }).exerciseCatalog;
  if (!Array.isArray(list)) fail('exerciseCatalog ausente');
  const parsed = list.map(parseExercise).sort((a, b) => a.sortOrder - b.sortOrder);

  const ids = new Set<string>();
  const videos = new Set<string>();
  for (const ex of parsed) {
    if (ids.has(ex.id)) fail(`id duplicado: ${ex.id}`);
    if (videos.has(ex.videoId)) fail(`videoId duplicado: ${ex.videoId}`);
    ids.add(ex.id);
    videos.add(ex.videoId);
  }
  return parsed;
}

/** Catálogo embutido. É a fonte de verdade quando o banco não está disponível
 *  e prevalece sobre o banco nos campos de análise e de vídeo. */
export const EXERCISE_CATALOG: Exercise[] = buildCatalog();

export const CATALOG_MUSCLE_GROUPS = MUSCLE_GROUPS;

export const ANALYSIS_PROFILE_META: Record<AnalysisProfile, AnalysisProfileMeta> = {
  squat: {
    profile: 'squat',
    code: 'SQ',
    label: 'Agachamento',
    shortLabel: 'Agachamento',
    views: ['Lateral', 'Frontal'],
    referenceExerciseId: 'bodyweight-squat',
    cycleNoun: 'repeticao',
  },
  pushup: {
    profile: 'pushup',
    code: 'FX',
    label: 'Flexão',
    shortLabel: 'Flexão',
    views: ['Lateral'],
    referenceExerciseId: 'push-up',
    cycleNoun: 'repeticao',
  },
  curl: {
    profile: 'curl',
    code: 'RC',
    label: 'Rosca direta',
    shortLabel: 'Rosca',
    views: ['Lateral'],
    referenceExerciseId: 'barbell-curl',
    cycleNoun: 'repeticao',
  },
  lunge: {
    profile: 'lunge',
    code: 'AF',
    label: 'Afundo livre / caminhando',
    shortLabel: 'Afundo',
    views: ['Lateral'],
    referenceExerciseId: 'reverse-lunge',
    cycleNoun: 'passada',
  },
};

export const ANALYSIS_PROFILE_ORDER: AnalysisProfile[] = ['squat', 'pushup', 'curl', 'lunge'];

export function findExercise(list: Exercise[], id: string): Exercise | undefined {
  return list.find((ex) => ex.id === id);
}

export function referenceExerciseFor(list: Exercise[], profile: AnalysisProfile): Exercise | undefined {
  return findExercise(list, ANALYSIS_PROFILE_META[profile].referenceExerciseId);
}

export function youtubeThumbnail(videoId: string): string {
  return `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
}

export function youtubeWatchUrl(videoId: string): string {
  return `https://www.youtube.com/watch?v=${videoId}`;
}
