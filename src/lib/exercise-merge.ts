import { EXERCISE_CATALOG } from '@/lib/catalog';
import type { AnalysisProfile, CameraView, Difficulty, Exercise, MuscleGroup } from '@/lib/types';

/** Linha crua vinda do banco, ainda com listas serializadas em JSON. */
export interface RawExerciseRow {
  id: string;
  name: string;
  muscleGroup: string;
  secondaryMuscles: string;
  equipment: string;
  difficulty: string;
  motion: string;
  description: string;
  steps: string;
  commonMistake: string;
  analyzable: boolean | number;
  analysisProfile: string | null;
  cameraView: string;
  sortOrder: number;
  videoId: string;
  videoSource: string;
  videoUrl: string;
}

function parseList(value: string, fallback: string[]): string[] {
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed) && parsed.every((v) => typeof v === 'string')) return parsed;
  } catch {
    /* linha corrompida: cai no fallback do catálogo */
  }
  return fallback;
}

/**
 * O banco é a fonte persistente, mas o catálogo embutido prevalece nos campos
 * de análise e de vídeo. Isso evita que um banco semeado por uma versão antiga
 * apague um recurso de análise ou sirva um vídeo já corrigido no código.
 */
export function mergeCatalogWithRows(rows: RawExerciseRow[]): Exercise[] {
  const embedded = new Map(EXERCISE_CATALOG.map((ex) => [ex.id, ex]));
  const merged: Exercise[] = [];

  for (const row of rows) {
    const base = embedded.get(row.id);
    if (!base) continue; // linha órfã: sem contraparte no catálogo, fica de fora
    merged.push({
      ...base,
      name: row.name || base.name,
      muscleGroup: (row.muscleGroup || base.muscleGroup) as MuscleGroup,
      secondaryMuscles: parseList(row.secondaryMuscles, base.secondaryMuscles),
      equipment: row.equipment || base.equipment,
      difficulty: (row.difficulty || base.difficulty) as Difficulty,
      motion: row.motion || base.motion,
      description: row.description || base.description,
      steps: (parseList(row.steps, base.steps).length === 3
        ? (parseList(row.steps, base.steps) as [string, string, string])
        : base.steps),
      commonMistake: row.commonMistake || base.commonMistake,
      sortOrder: Number.isFinite(row.sortOrder) ? row.sortOrder : base.sortOrder,
      // Campos com precedência do catálogo embutido:
      analyzable: base.analyzable,
      analysisProfile: base.analysisProfile as AnalysisProfile | null,
      cameraView: base.cameraView as CameraView,
      videoId: base.videoId,
      videoSource: base.videoSource,
      videoUrl: base.videoUrl,
    });
    embedded.delete(row.id);
  }

  // Exercícios que existem no catálogo e ainda não foram semeados entram assim mesmo.
  for (const missing of embedded.values()) merged.push(missing);

  return merged.sort((a, b) => a.sortOrder - b.sortOrder);
}
