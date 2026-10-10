import { describe, expect, it } from 'vitest';
import { EXERCISE_CATALOG } from '@/lib/catalog';
import { mergeCatalogWithRows, type RawExerciseRow } from '@/lib/exercise-merge';

function rowFrom(id: string, overrides: Partial<RawExerciseRow> = {}): RawExerciseRow {
  const base = EXERCISE_CATALOG.find((e) => e.id === id)!;
  return {
    id: base.id,
    name: base.name,
    muscleGroup: base.muscleGroup,
    secondaryMuscles: JSON.stringify(base.secondaryMuscles),
    equipment: base.equipment,
    difficulty: base.difficulty,
    motion: base.motion,
    description: base.description,
    steps: JSON.stringify(base.steps),
    commonMistake: base.commonMistake,
    analyzable: base.analyzable,
    analysisProfile: base.analysisProfile,
    cameraView: base.cameraView,
    sortOrder: base.sortOrder,
    videoId: base.videoId,
    videoSource: base.videoSource,
    videoUrl: base.videoUrl,
    ...overrides,
  };
}

describe('banco com fallback e precedência do catálogo', () => {
  it('mantém os 23 exercícios quando o banco está vazio', () => {
    expect(mergeCatalogWithRows([])).toHaveLength(23);
  });

  it('completa o que o banco ainda não tem', () => {
    const merged = mergeCatalogWithRows([rowFrom('push-up')]);
    expect(merged).toHaveLength(23);
    expect(merged.map((e) => e.sortOrder)).toEqual(Array.from({ length: 23 }, (_, i) => i + 1));
  });

  it('deixa o catálogo prevalecer sobre linha antiga de análise e de vídeo', () => {
    const stale = rowFrom('reverse-lunge', {
      analyzable: false,
      analysisProfile: null,
      cameraView: 'Frontal',
      videoId: 'antigo00000',
      videoSource: 'Fonte antiga',
      videoUrl: 'https://www.youtube.com/watch?v=antigo00000',
    });
    const merged = mergeCatalogWithRows([stale]);
    const lunge = merged.find((e) => e.id === 'reverse-lunge')!;

    expect(lunge.analyzable).toBe(true);
    expect(lunge.analysisProfile).toBe('lunge');
    expect(lunge.cameraView).toBe('Lateral');
    expect(lunge.videoId).toBe('mAgbXQdd4LM');
    expect(lunge.videoSource).toBe('PureGym');
    expect(lunge.videoUrl).toBe('https://www.youtube.com/watch?v=mAgbXQdd4LM');
  });

  it('aceita texto editado no banco para os campos editoriais', () => {
    const edited = rowFrom('plank', { description: 'Descrição revisada pela equipe.' });
    const merged = mergeCatalogWithRows([edited]);
    expect(merged.find((e) => e.id === 'plank')?.description).toBe('Descrição revisada pela equipe.');
  });

  it('ignora linha órfã que não existe no catálogo', () => {
    const orphan = rowFrom('plank', { id: 'exercicio-fantasma' });
    const merged = mergeCatalogWithRows([orphan]);
    expect(merged).toHaveLength(23);
    expect(merged.some((e) => e.id === 'exercicio-fantasma')).toBe(false);
  });

  it('cai no catálogo quando a linha traz JSON corrompido', () => {
    const broken = rowFrom('plank', { steps: '{corrompido', secondaryMuscles: 'nao-json' });
    const plank = mergeCatalogWithRows([broken]).find((e) => e.id === 'plank')!;
    expect(plank.steps).toHaveLength(3);
    expect(plank.secondaryMuscles).toEqual(['Ombros', 'Glúteos']);
  });
});
