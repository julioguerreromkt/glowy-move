import { describe, expect, it } from 'vitest';
import { EXERCISE_CATALOG } from '@/lib/catalog';
import { isWeeklyPlan, WEEK_DAYS } from '@/lib/planner';
import { PLAN_PRESETS, buildPresetPlan, findPreset } from '@/lib/plans/presets';

const catalog = EXERCISE_CATALOG;

describe('planos prontos', () => {
  it('tem os quatro planos esperados', () => {
    expect(PLAN_PRESETS.map((p) => p.id)).toEqual(['ppl', 'upper-lower', 'full-body', '5x5']);
  });

  it('cada preset gera uma WeeklyPlan válida de 7 dias', () => {
    for (const preset of PLAN_PRESETS) {
      const plan = buildPresetPlan(preset, catalog);
      expect(isWeeklyPlan(plan)).toBe(true);
      expect(plan.days).toHaveLength(WEEK_DAYS.length);
      // Dias de treino não são descanso; os demais são.
      const training = plan.days.filter((d) => !d.rest);
      expect(training.length).toBe(preset.days.length);
      for (const day of training) {
        expect(day.exercises.length).toBeGreaterThan(0);
        for (const ex of day.exercises) {
          expect(ex.sets).toBe(preset.sets);
          expect(ex.reps).toBe(preset.reps);
          expect(ex.restSeconds).toBe(preset.restSeconds);
        }
      }
      // Totais batem com a soma dos dias.
      const totalExercises = plan.days.reduce((s, d) => s + d.exercises.length, 0);
      const totalSets = plan.days.reduce((s, d) => s + d.exercises.reduce((a, e) => a + e.sets, 0), 0);
      expect(plan.totalExercises).toBe(totalExercises);
      expect(plan.totalSets).toBe(totalSets);
    }
  });

  it('PPL distribui Push, Pull e Legs em SEG, QUA e SEX', () => {
    const plan = buildPresetPlan(findPreset('ppl')!, catalog);
    const labels = plan.days.filter((d) => !d.rest).map((d) => d.sessionLabel);
    expect(labels).toEqual(['Push', 'Pull', 'Legs']);
    const trainingKeys = plan.days.filter((d) => !d.rest).map((d) => d.day);
    expect(trainingKeys).toEqual(['SEG', 'QUA', 'SEX']);
  });

  it('Upper/Lower alterna tronco e pernas em quatro dias', () => {
    const plan = buildPresetPlan(findPreset('upper-lower')!, catalog);
    const labels = plan.days.filter((d) => !d.rest).map((d) => d.sessionLabel);
    expect(labels).toEqual(['Upper', 'Lower', 'Upper', 'Lower']);
  });

  it('5x5 usa os compostos fixos e o esquema 5 de 5', () => {
    const plan = buildPresetPlan(findPreset('5x5')!, catalog);
    const training = plan.days.filter((d) => !d.rest);
    expect(training.map((d) => d.sessionLabel)).toEqual(['Treino A', 'Treino B', 'Treino A']);
    expect(training[0].exercises.map((e) => e.exerciseId)).toEqual([
      'bodyweight-squat',
      'bench-press',
      'barbell-row',
    ]);
    expect(training[1].exercises.map((e) => e.exerciseId)).toEqual([
      'bodyweight-squat',
      'shoulder-press',
      'romanian-deadlift',
    ]);
    for (const ex of training[0].exercises) {
      expect(ex.sets).toBe(5);
      expect(ex.reps).toBe('5');
    }
  });

  it('é determinístico: mesma entrada, mesma rotina', () => {
    const a = buildPresetPlan(findPreset('full-body')!, catalog);
    const b = buildPresetPlan(findPreset('full-body')!, catalog);
    expect(a).toEqual(b);
  });

  it('todos os ids fixos do 5x5 existem no catálogo', () => {
    const ids = new Set(catalog.map((e) => e.id));
    for (const session of findPreset('5x5')!.sessions) {
      for (const id of session.exerciseIds ?? []) {
        expect(ids.has(id)).toBe(true);
      }
    }
  });
});
