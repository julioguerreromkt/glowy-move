/**
 * Planos prontos que carregam como rotina editável no planejador semanal.
 *
 * Cada preset é montado deterministicamente sobre o catálogo e produz uma
 * WeeklyPlan no mesmo formato que o planejador já usa, então a tela de Rotina
 * renderiza e persiste sem mudança. Depois de carregado, segue editável pelos
 * controles atuais (Gerar, Refazer, Reorganizar).
 *
 * Os planos são referências clássicas adaptadas ao catálogo embutido, não
 * prescrição. A escolha de exercícios respeita o que existe na biblioteca.
 */

import { findExercise } from '@/lib/catalog';
import {
  WEEK_DAYS,
  type DayKey,
  type Goal,
  type Level,
  type PlannedDay,
  type PlannedExercise,
  type SessionMinutes,
  type WeeklyPlan,
} from '@/lib/planner';
import type { Exercise, MuscleGroup } from '@/lib/types';

interface PresetSession {
  label: string;
  /** Foco muscular: o builder escolhe exercícios do catálogo por grupo. */
  focus?: MuscleGroup[];
  /** Exercícios fixos por id. Quando presente, prevalece sobre o foco. */
  exerciseIds?: string[];
  /** Quantidade de exercícios quando a sessão é por foco. */
  count?: number;
}

export interface PlanPreset {
  id: string;
  name: string;
  tagline: string;
  description: string;
  goal: Goal;
  level: Level;
  minutes: SessionMinutes;
  sets: number;
  reps: string;
  restSeconds: number;
  /** Dias de treino. Os demais viram recuperação. */
  days: DayKey[];
  /** Sessões cicladas sobre os dias de treino, na ordem. */
  sessions: PresetSession[];
}

export const PLAN_PRESETS: PlanPreset[] = [
  {
    id: 'ppl',
    name: 'Push / Pull / Legs',
    tagline: 'Empurrar, puxar, pernas',
    description: 'Três sessões que dividem o corpo por padrão de movimento. Clássico para quem treina de 3 a 6 vezes por semana.',
    goal: 'Hipertrofia',
    level: 'Intermediário',
    minutes: 60,
    sets: 3,
    reps: '8 a 12',
    restSeconds: 75,
    days: ['SEG', 'QUA', 'SEX'],
    sessions: [
      { label: 'Push', focus: ['Peito', 'Ombros', 'Tríceps'], count: 5 },
      { label: 'Pull', focus: ['Costas', 'Bíceps'], count: 5 },
      { label: 'Legs', focus: ['Quadríceps', 'Glúteos e posterior', 'Panturrilhas'], count: 5 },
    ],
  },
  {
    id: 'upper-lower',
    name: 'Upper / Lower',
    tagline: 'Superior e inferior',
    description: 'Alterna um dia de tronco e um dia de pernas, quatro vezes por semana. Bom equilíbrio entre volume e descanso.',
    goal: 'Hipertrofia',
    level: 'Intermediário',
    minutes: 60,
    sets: 3,
    reps: '8 a 12',
    restSeconds: 75,
    days: ['SEG', 'TER', 'QUI', 'SEX'],
    sessions: [
      { label: 'Upper', focus: ['Peito', 'Costas', 'Ombros', 'Bíceps', 'Tríceps'], count: 5 },
      { label: 'Lower', focus: ['Quadríceps', 'Glúteos e posterior', 'Panturrilhas', 'Core'], count: 5 },
    ],
  },
  {
    id: 'full-body',
    name: 'Full Body',
    tagline: 'Corpo inteiro',
    description: 'O corpo todo em cada sessão, três vezes por semana. Boa densidade para quem tem poucos dias disponíveis.',
    goal: 'Saúde e constância',
    level: 'Iniciante',
    minutes: 45,
    sets: 3,
    reps: '10 a 12',
    restSeconds: 60,
    days: ['SEG', 'QUA', 'SEX'],
    sessions: [
      {
        label: 'Full Body',
        focus: ['Quadríceps', 'Peito', 'Costas', 'Glúteos e posterior', 'Ombros', 'Core'],
        count: 6,
      },
    ],
  },
  {
    id: '5x5',
    name: '5x5 de força',
    tagline: '5 séries de 5, compostos',
    description:
      'Força nos grandes compostos, cinco séries de cinco, três vezes por semana, alternando dois treinos. Adaptado ao catálogo: agachamento, supino e remada em A; agachamento, desenvolvimento e terra romeno em B.',
    goal: 'Força',
    level: 'Intermediário',
    minutes: 60,
    sets: 5,
    reps: '5',
    restSeconds: 180,
    days: ['SEG', 'QUA', 'SEX'],
    sessions: [
      { label: 'Treino A', exerciseIds: ['bodyweight-squat', 'bench-press', 'barbell-row'] },
      { label: 'Treino B', exerciseIds: ['bodyweight-squat', 'shoulder-press', 'romanian-deadlift'] },
    ],
  },
];

export function findPreset(id: string): PlanPreset | undefined {
  return PLAN_PRESETS.find((preset) => preset.id === id);
}

function toPlanned(exercise: Exercise, preset: PlanPreset): PlannedExercise {
  return {
    exerciseId: exercise.id,
    name: exercise.name,
    muscleGroup: exercise.muscleGroup,
    equipment: exercise.equipment,
    difficulty: exercise.difficulty,
    sets: preset.sets,
    reps: preset.reps,
    restSeconds: preset.restSeconds,
    analyzable: exercise.analyzable,
    analysisProfile: exercise.analysisProfile,
  };
}

/** Escolhe exercícios por foco: menor uso na semana primeiro, desempate por ordem. */
function pickByFocus(
  catalog: Exercise[],
  focus: MuscleGroup[],
  count: number,
  usage: Map<string, number>,
): Exercise[] {
  const pool = catalog
    .filter((ex) => focus.includes(ex.muscleGroup))
    .sort((a, b) => a.sortOrder - b.sortOrder);

  const chosen: Exercise[] = [];
  const usedToday = new Set<string>();
  let guard = 0;
  while (chosen.length < count && guard < count * (pool.length + 2)) {
    guard += 1;
    const available = pool.filter((ex) => !usedToday.has(ex.id));
    if (!available.length) break;
    const next = available.reduce((best, candidate) => {
      const bestUse = usage.get(best.id) ?? 0;
      const candidateUse = usage.get(candidate.id) ?? 0;
      if (candidateUse < bestUse) return candidate;
      if (candidateUse > bestUse) return best;
      return candidate.sortOrder < best.sortOrder ? candidate : best;
    }, available[0]);
    usedToday.add(next.id);
    usage.set(next.id, (usage.get(next.id) ?? 0) + 1);
    chosen.push(next);
  }
  return chosen;
}

function orderedTrainingDays(days: DayKey[]): DayKey[] {
  const order = WEEK_DAYS.map((d) => d.key) as DayKey[];
  return order.filter((d) => days.includes(d));
}

/** Monta a WeeklyPlan do preset sobre o catálogo. Mesma entrada, mesma rotina. */
export function buildPresetPlan(preset: PlanPreset, catalog: Exercise[]): WeeklyPlan {
  const trainingDays = orderedTrainingDays(preset.days);
  const usage = new Map<string, number>();
  const days: PlannedDay[] = [];

  for (const weekDay of WEEK_DAYS) {
    const key = weekDay.key as DayKey;
    const dayIndex = trainingDays.indexOf(key);
    if (dayIndex === -1) {
      days.push({
        day: key,
        dayLabel: weekDay.label,
        rest: true,
        sessionLabel: null,
        focus: [],
        minutes: 0,
        exercises: [],
      });
      continue;
    }

    const session = preset.sessions[dayIndex % preset.sessions.length];
    let chosen: Exercise[];
    if (session.exerciseIds && session.exerciseIds.length) {
      chosen = session.exerciseIds
        .map((id) => findExercise(catalog, id))
        .filter((ex): ex is Exercise => Boolean(ex));
    } else {
      chosen = pickByFocus(catalog, session.focus ?? [], session.count ?? 0, usage);
    }

    const exercises = chosen.map((ex) => toPlanned(ex, preset));
    const focus: MuscleGroup[] = [];
    for (const ex of exercises) if (!focus.includes(ex.muscleGroup)) focus.push(ex.muscleGroup);

    days.push({
      day: key,
      dayLabel: weekDay.label,
      rest: exercises.length === 0,
      sessionLabel: exercises.length ? session.label : null,
      focus,
      minutes: preset.minutes,
      exercises,
    });
  }

  const totalExercises = days.reduce((sum, d) => sum + d.exercises.length, 0);
  const totalSets = days.reduce((sum, d) => sum + d.exercises.reduce((s, e) => s + e.sets, 0), 0);

  return {
    version: 1,
    goal: preset.goal,
    level: preset.level,
    minutes: preset.minutes,
    rotation: 0,
    days,
    totalExercises,
    totalSets,
  };
}
