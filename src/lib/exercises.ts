import { EXERCISE_CATALOG } from '@/lib/catalog';
import { mergeCatalogWithRows, type RawExerciseRow } from '@/lib/exercise-merge';
import type { Exercise } from '@/lib/types';

export interface ExerciseSource {
  exercises: Exercise[];
  /** 'banco' quando o SQLite respondeu; 'catálogo embutido' no fallback. */
  origin: 'banco' | 'catálogo embutido';
}

/**
 * Lê os exercícios do banco quando ele existe e cai no catálogo embutido em
 * qualquer falha. Nenhuma superfície do produto quebra por ausência de banco.
 */
export async function getExerciseSource(): Promise<ExerciseSource> {
  try {
    const { getDatabase } = await import('../../db/client');
    const { exercises } = await import('../../db/schema');
    const db = getDatabase();
    if (!db) return { exercises: EXERCISE_CATALOG, origin: 'catálogo embutido' };
    const rows = (await db.select().from(exercises)) as unknown as RawExerciseRow[];
    if (!rows.length) return { exercises: EXERCISE_CATALOG, origin: 'catálogo embutido' };
    return { exercises: mergeCatalogWithRows(rows), origin: 'banco' };
  } catch {
    return { exercises: EXERCISE_CATALOG, origin: 'catálogo embutido' };
  }
}

export async function getExercises(): Promise<Exercise[]> {
  return (await getExerciseSource()).exercises;
}
