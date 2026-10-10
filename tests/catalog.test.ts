import { describe, expect, it } from 'vitest';
import { ANALYSIS_PROFILE_META, ANALYSIS_PROFILE_ORDER, EXERCISE_CATALOG, referenceExerciseFor } from '@/lib/catalog';
import { MUSCLE_GROUPS } from '@/lib/types';

describe('catálogo embutido', () => {
  it('tem exatamente 23 exercícios em 9 grupos musculares', () => {
    expect(EXERCISE_CATALOG).toHaveLength(23);
    expect(new Set(EXERCISE_CATALOG.map((e) => e.muscleGroup)).size).toBe(9);
    expect(MUSCLE_GROUPS).toHaveLength(9);
  });

  it('mantém a ordem declarada em sortOrder de 1 a 23', () => {
    expect(EXERCISE_CATALOG.map((e) => e.sortOrder)).toEqual(Array.from({ length: 23 }, (_, i) => i + 1));
  });

  it('marca exatamente 4 exercícios com análise por vídeo', () => {
    const analyzable = EXERCISE_CATALOG.filter((e) => e.analyzable);
    expect(analyzable).toHaveLength(4);
    expect(analyzable.map((e) => e.id).sort()).toEqual(
      ['barbell-curl', 'bodyweight-squat', 'push-up', 'reverse-lunge'].sort(),
    );
    expect(analyzable.map((e) => e.analysisProfile).sort()).toEqual(['curl', 'lunge', 'pushup', 'squat']);
  });

  it('não repete id nem vídeo', () => {
    expect(new Set(EXERCISE_CATALOG.map((e) => e.id)).size).toBe(23);
    expect(new Set(EXERCISE_CATALOG.map((e) => e.videoId)).size).toBe(23);
  });

  it('traz três passos, erro comum e descrição em todos os registros', () => {
    for (const exercise of EXERCISE_CATALOG) {
      expect(exercise.steps).toHaveLength(3);
      exercise.steps.forEach((step) => expect(step.trim().length).toBeGreaterThan(8));
      expect(exercise.commonMistake.trim().length).toBeGreaterThan(8);
      expect(exercise.description.trim().length).toBeGreaterThan(8);
      expect(exercise.videoSource.trim().length).toBeGreaterThan(0);
    }
  });

  it('liga cada perfil de análise ao exercício de referência correto', () => {
    const expected: Record<string, string> = {
      squat: 'bodyweight-squat',
      pushup: 'push-up',
      curl: 'barbell-curl',
      lunge: 'reverse-lunge',
    };
    for (const profile of ANALYSIS_PROFILE_ORDER) {
      expect(ANALYSIS_PROFILE_META[profile].referenceExerciseId).toBe(expected[profile]);
      const reference = referenceExerciseFor(EXERCISE_CATALOG, profile);
      expect(reference?.id).toBe(expected[profile]);
      expect(reference?.analysisProfile).toBe(profile);
    }
  });

  it('usa o vocabulário de passada apenas no afundo', () => {
    expect(ANALYSIS_PROFILE_META.lunge.cycleNoun).toBe('passada');
    expect(ANALYSIS_PROFILE_META.squat.cycleNoun).toBe('repeticao');
    expect(ANALYSIS_PROFILE_META.pushup.cycleNoun).toBe('repeticao');
    expect(ANALYSIS_PROFILE_META.curl.cycleNoun).toBe('repeticao');
  });

  it('aceita vista frontal ou lateral só no agachamento', () => {
    expect(ANALYSIS_PROFILE_META.squat.views).toEqual(['Lateral', 'Frontal']);
    expect(ANALYSIS_PROFILE_META.pushup.views).toEqual(['Lateral']);
    expect(ANALYSIS_PROFILE_META.curl.views).toEqual(['Lateral']);
    expect(ANALYSIS_PROFILE_META.lunge.views).toEqual(['Lateral']);
  });
});
