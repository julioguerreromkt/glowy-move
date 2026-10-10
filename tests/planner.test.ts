import { describe, expect, it } from 'vitest';
import { EXERCISE_CATALOG } from '@/lib/catalog';
import {
  DEFAULT_PLANNER_INPUT,
  LEGACY_PLAN_STORAGE_KEY,
  PLAN_STORAGE_KEY,
  exercisesPerSession,
  generateWeeklyPlan,
  validatePlannerInput,
  type PlannerInput,
} from '@/lib/planner';

const catalog = EXERCISE_CATALOG;

describe('planejador semanal', () => {
  it('usa a chave de armazenamento da marca e conhece a antiga', () => {
    expect(PLAN_STORAGE_KEY).toBe('glowy-move-weekly-plan-v1');
    expect(LEGACY_PLAN_STORAGE_KEY).toBe('form-weekly-plan-v1');
  });

  it('converte duração em quantidade de exercícios', () => {
    expect(exercisesPerSession(30)).toBe(3);
    expect(exercisesPerSession(35)).toBe(3);
    expect(exercisesPerSession(45)).toBe(4);
    expect(exercisesPerSession(50)).toBe(4);
    expect(exercisesPerSession(60)).toBe(5);
    expect(exercisesPerSession(65)).toBe(5);
    expect(exercisesPerSession(75)).toBe(6);
  });

  it('valida altura, peso, dias e músculos', () => {
    expect(validatePlannerInput(DEFAULT_PLANNER_INPUT).ok).toBe(true);
    expect(validatePlannerInput({ ...DEFAULT_PLANNER_INPUT, heightCm: 119 }).ok).toBe(false);
    expect(validatePlannerInput({ ...DEFAULT_PLANNER_INPUT, heightCm: 231 }).ok).toBe(false);
    expect(validatePlannerInput({ ...DEFAULT_PLANNER_INPUT, weightKg: 34 }).ok).toBe(false);
    expect(validatePlannerInput({ ...DEFAULT_PLANNER_INPUT, weightKg: 251 }).ok).toBe(false);
    expect(validatePlannerInput({ ...DEFAULT_PLANNER_INPUT, days: ['SEG'] }).ok).toBe(false);
    expect(validatePlannerInput({ ...DEFAULT_PLANNER_INPUT, muscles: [] }).ok).toBe(false);
  });

  it('gera a semana completa com os padrões', () => {
    const plan = generateWeeklyPlan(DEFAULT_PLANNER_INPUT, catalog);
    expect(plan.days).toHaveLength(7);
    const training = plan.days.filter((d) => !d.rest);
    expect(training.map((d) => d.day)).toEqual(['SEG', 'QUA', 'SEX']);
    for (const day of training) {
      expect(day.exercises).toHaveLength(4);
      expect(day.sessionLabel).toMatch(/^Treino [A-Z]$/);
      day.exercises.forEach((exercise) => {
        expect(exercise.sets).toBe(2);
        expect(exercise.reps).toBe('8 a 12');
        expect(exercise.restSeconds).toBe(75);
      });
    }
    const rest = plan.days.filter((d) => d.rest);
    expect(rest.map((d) => d.day)).toEqual(['TER', 'QUI', 'SAB', 'DOM']);
    rest.forEach((day) => expect(day.exercises).toHaveLength(0));
  });

  it('é determinístico: mesma entrada, mesma rotina', () => {
    const a = generateWeeklyPlan(DEFAULT_PLANNER_INPUT, catalog);
    const b = generateWeeklyPlan(DEFAULT_PLANNER_INPUT, catalog);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });

  it('reorganiza a semana quando a rotação muda', () => {
    const base = generateWeeklyPlan(DEFAULT_PLANNER_INPUT, catalog, 0);
    const rotated = generateWeeklyPlan(DEFAULT_PLANNER_INPUT, catalog, 1);
    expect(JSON.stringify(rotated)).not.toBe(JSON.stringify(base));
    expect(rotated.days.filter((d) => !d.rest)).toHaveLength(3);
  });

  it('nunca entrega exercício avançado para iniciante', () => {
    const input: PlannerInput = { ...DEFAULT_PLANNER_INPUT, muscles: ['Costas'], days: ['SEG', 'TER', 'QUA'] };
    const plan = generateWeeklyPlan(input, catalog);
    const chosen = plan.days.flatMap((d) => d.exercises);
    expect(chosen.length).toBeGreaterThan(0);
    expect(chosen.some((e) => e.difficulty === 'Avançado')).toBe(false);
    expect(chosen.some((e) => e.exerciseId === 'pull-up')).toBe(false);

    const advanced = generateWeeklyPlan({ ...input, level: 'Avançado' }, catalog);
    expect(advanced.days.flatMap((d) => d.exercises).some((e) => e.exerciseId === 'pull-up')).toBe(true);
  });

  it('aplica séries por nível e reforça a primeira série em Força', () => {
    const beginner = generateWeeklyPlan(DEFAULT_PLANNER_INPUT, catalog);
    expect(beginner.days.find((d) => !d.rest)?.exercises[0].sets).toBe(2);

    const strength = generateWeeklyPlan({ ...DEFAULT_PLANNER_INPUT, goal: 'Força' }, catalog);
    const day = strength.days.find((d) => !d.rest);
    expect(day?.exercises[0].sets).toBe(3);
    expect(day?.exercises[1].sets).toBe(2);
    expect(day?.exercises[0].reps).toBe('5 a 8');
    expect(day?.exercises[0].restSeconds).toBe(120);

    const advanced = generateWeeklyPlan({ ...DEFAULT_PLANNER_INPUT, level: 'Avançado' }, catalog);
    expect(advanced.days.find((d) => !d.rest)?.exercises[0].sets).toBe(4);

    const conditioning = generateWeeklyPlan({ ...DEFAULT_PLANNER_INPUT, goal: 'Condicionamento' }, catalog);
    expect(conditioning.days.find((d) => !d.rest)?.exercises[0].reps).toBe('12 a 15');
    expect(conditioning.days.find((d) => !d.rest)?.exercises[0].restSeconds).toBe(45);

    const health = generateWeeklyPlan({ ...DEFAULT_PLANNER_INPUT, goal: 'Saúde e constância' }, catalog);
    expect(health.days.find((d) => !d.rest)?.exercises[0].reps).toBe('10 a 12');
    expect(health.days.find((d) => !d.rest)?.exercises[0].restSeconds).toBe(60);
  });

  it('não repete exercício no mesmo dia e distribui antes de repetir na semana', () => {
    const input: PlannerInput = {
      ...DEFAULT_PLANNER_INPUT,
      minutes: 30,
      days: ['SEG', 'TER', 'QUA', 'QUI'],
      muscles: ['Core'],
    };
    const plan = generateWeeklyPlan(input, catalog);
    for (const day of plan.days.filter((d) => !d.rest)) {
      expect(new Set(day.exercises.map((e) => e.exerciseId)).size).toBe(day.exercises.length);
    }
    const counts = new Map<string, number>();
    for (const exercise of plan.days.flatMap((d) => d.exercises)) {
      counts.set(exercise.exerciseId, (counts.get(exercise.exerciseId) ?? 0) + 1);
    }
    const values = [...counts.values()];
    expect(Math.max(...values) - Math.min(...values)).toBeLessThanOrEqual(1);
  });

  it('respeita a quantidade de exercícios por duração', () => {
    for (const [minutes, expected] of [
      [30, 3],
      [45, 4],
      [60, 5],
      [75, 6],
    ] as const) {
      const plan = generateWeeklyPlan({ ...DEFAULT_PLANNER_INPUT, minutes }, catalog);
      const day = plan.days.find((d) => !d.rest);
      expect(day?.exercises.length).toBe(expected);
    }
  });
});
