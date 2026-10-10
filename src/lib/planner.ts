import { MUSCLE_GROUPS, type AnalysisProfile, type Difficulty, type Exercise, type MuscleGroup } from '@/lib/types';

export const GOALS = ['Hipertrofia', 'Força', 'Condicionamento', 'Saúde e constância'] as const;
export type Goal = (typeof GOALS)[number];

export const LEVELS = ['Iniciante', 'Intermediário', 'Avançado'] as const;
export type Level = (typeof LEVELS)[number];

export const SESSION_MINUTES = [30, 45, 60, 75] as const;
export type SessionMinutes = (typeof SESSION_MINUTES)[number];

export const WEEK_DAYS = [
  { key: 'SEG', label: 'Segunda' },
  { key: 'TER', label: 'Terça' },
  { key: 'QUA', label: 'Quarta' },
  { key: 'QUI', label: 'Quinta' },
  { key: 'SEX', label: 'Sexta' },
  { key: 'SAB', label: 'Sábado' },
  { key: 'DOM', label: 'Domingo' },
] as const;
export type DayKey = (typeof WEEK_DAYS)[number]['key'];

export const HEIGHT_RANGE = { min: 120, max: 230 } as const;
export const WEIGHT_RANGE = { min: 35, max: 250 } as const;

export const PLAN_STORAGE_KEY = 'glowy-move-weekly-plan-v1';
/** Chave usada antes da marca Glowy Move. Lida uma vez, para não perder rotina salva. */
export const LEGACY_PLAN_STORAGE_KEY = 'form-weekly-plan-v1';

export const DEFAULT_PLANNER_INPUT: PlannerInput = {
  heightCm: 175,
  weightKg: 75,
  goal: 'Hipertrofia',
  level: 'Iniciante',
  minutes: 45,
  days: ['SEG', 'QUA', 'SEX'],
  muscles: ['Peito', 'Costas', 'Quadríceps', 'Glúteos e posterior', 'Ombros', 'Core'],
};

export interface PlannerInput {
  heightCm: number;
  weightKg: number;
  goal: Goal;
  level: Level;
  minutes: SessionMinutes;
  days: DayKey[];
  muscles: MuscleGroup[];
}

export interface PlannedExercise {
  exerciseId: string;
  name: string;
  muscleGroup: MuscleGroup;
  equipment: string;
  difficulty: Difficulty;
  sets: number;
  reps: string;
  restSeconds: number;
  analyzable: boolean;
  analysisProfile: AnalysisProfile | null;
}

export interface PlannedDay {
  day: DayKey;
  dayLabel: string;
  rest: boolean;
  sessionLabel: string | null;
  focus: MuscleGroup[];
  minutes: number;
  exercises: PlannedExercise[];
}

export interface WeeklyPlan {
  version: 1;
  goal: Goal;
  level: Level;
  minutes: SessionMinutes;
  rotation: number;
  days: PlannedDay[];
  totalExercises: number;
  totalSets: number;
}

export interface PlannerValidation {
  ok: boolean;
  errors: string[];
}

const BUNDLES: Array<{ id: string; muscles: MuscleGroup[] }> = [
  { id: 'peito-ombros-triceps', muscles: ['Peito', 'Ombros', 'Tríceps'] },
  { id: 'costas-biceps', muscles: ['Costas', 'Bíceps'] },
  { id: 'pernas', muscles: ['Quadríceps', 'Glúteos e posterior', 'Panturrilhas'] },
  { id: 'core', muscles: ['Core'] },
];

const PRESCRIPTION: Record<Goal, { reps: string; restSeconds: number }> = {
  Hipertrofia: { reps: '8 a 12', restSeconds: 75 },
  Força: { reps: '5 a 8', restSeconds: 120 },
  Condicionamento: { reps: '12 a 15', restSeconds: 45 },
  'Saúde e constância': { reps: '10 a 12', restSeconds: 60 },
};

const SETS_BY_LEVEL: Record<Level, number> = {
  Iniciante: 2,
  Intermediário: 3,
  Avançado: 4,
};

const SESSION_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];

export function exercisesPerSession(minutes: number): number {
  if (minutes <= 35) return 3;
  if (minutes <= 50) return 4;
  if (minutes <= 65) return 5;
  return 6;
}

export function allowsDifficulty(level: Level, difficulty: Difficulty): boolean {
  if (level === 'Iniciante') return difficulty !== 'Avançado';
  return true;
}

export function validatePlannerInput(input: PlannerInput): PlannerValidation {
  const errors: string[] = [];
  if (!Number.isFinite(input.heightCm) || input.heightCm < HEIGHT_RANGE.min || input.heightCm > HEIGHT_RANGE.max) {
    errors.push(`Informe a altura entre ${HEIGHT_RANGE.min} e ${HEIGHT_RANGE.max} cm.`);
  }
  if (!Number.isFinite(input.weightKg) || input.weightKg < WEIGHT_RANGE.min || input.weightKg > WEIGHT_RANGE.max) {
    errors.push(`Informe o peso entre ${WEIGHT_RANGE.min} e ${WEIGHT_RANGE.max} kg.`);
  }
  if (input.days.length < 2) errors.push('Escolha pelo menos dois dias de treino.');
  if (input.muscles.length < 1) errors.push('Escolha pelo menos um grupo muscular.');
  return { ok: errors.length === 0, errors };
}

function orderedDays(days: DayKey[]): DayKey[] {
  const order = WEEK_DAYS.map((d) => d.key) as DayKey[];
  return order.filter((d) => days.includes(d));
}

/**
 * Monta a semana com regras determinísticas: mesma entrada gera sempre a mesma
 * rotina. Nenhuma chamada externa, nenhum sorteio.
 */
export function generateWeeklyPlan(
  input: PlannerInput,
  catalog: Exercise[],
  rotation = 0,
): WeeklyPlan {
  const selected = new Set(input.muscles);
  const activeBundles = BUNDLES.map((bundle) => ({
    id: bundle.id,
    muscles: bundle.muscles.filter((m) => selected.has(m)),
  })).filter((bundle) => bundle.muscles.length > 0);

  const trainingDays = orderedDays(input.days);
  const perSession = exercisesPerSession(input.minutes);
  const baseSets = SETS_BY_LEVEL[input.level];
  const prescription = PRESCRIPTION[input.goal];

  const poolByMuscle = new Map<MuscleGroup, Exercise[]>();
  for (const muscle of selected) {
    const pool = catalog
      .filter((ex) => ex.muscleGroup === muscle && allowsDifficulty(input.level, ex.difficulty))
      .sort((a, b) => a.sortOrder - b.sortOrder);
    poolByMuscle.set(muscle, pool);
  }

  const usage = new Map<string, number>();
  const bundleLabels = new Map<string, string>();
  const days: PlannedDay[] = [];

  for (const weekDay of WEEK_DAYS) {
    const key = weekDay.key as DayKey;
    if (!trainingDays.includes(key)) {
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

    const dayIndex = trainingDays.indexOf(key);
    const bundle = activeBundles.length
      ? activeBundles[(dayIndex + rotation) % activeBundles.length]
      : { id: 'vazio', muscles: [] as MuscleGroup[] };

    if (!bundleLabels.has(bundle.id)) {
      const letter = SESSION_LETTERS[bundleLabels.size] ?? String(bundleLabels.size + 1);
      bundleLabels.set(bundle.id, `Treino ${letter}`);
    }

    const chosen: PlannedExercise[] = [];
    const usedToday = new Set<string>();
    const focus: MuscleGroup[] = [];

    const take = (muscles: MuscleGroup[]) => {
      let guard = 0;
      while (chosen.length < perSession && guard < perSession * (muscles.length + 2)) {
        guard += 1;
        let picked = false;
        for (const muscle of muscles) {
          if (chosen.length >= perSession) break;
          const pool = (poolByMuscle.get(muscle) ?? []).filter((ex) => !usedToday.has(ex.id));
          if (!pool.length) continue;
          // Menor uso na semana primeiro: evita repetir antes de esgotar alternativas.
          const next = pool.reduce((best, candidate) => {
            const bestUse = usage.get(best.id) ?? 0;
            const candidateUse = usage.get(candidate.id) ?? 0;
            if (candidateUse < bestUse) return candidate;
            if (candidateUse > bestUse) return best;
            return candidate.sortOrder < best.sortOrder ? candidate : best;
          }, pool[0]);

          usedToday.add(next.id);
          usage.set(next.id, (usage.get(next.id) ?? 0) + 1);
          if (!focus.includes(next.muscleGroup)) focus.push(next.muscleGroup);
          chosen.push({
            exerciseId: next.id,
            name: next.name,
            muscleGroup: next.muscleGroup,
            equipment: next.equipment,
            difficulty: next.difficulty,
            sets: baseSets,
            reps: prescription.reps,
            restSeconds: prescription.restSeconds,
            analyzable: next.analyzable,
            analysisProfile: next.analysisProfile,
          });
          picked = true;
        }
        if (!picked) break;
      }
    };

    take(bundle.muscles);
    if (chosen.length < perSession) {
      // O bundle do dia não tem alternativas suficientes no nível escolhido.
      // Completa a sessão com o restante da seleção, sempre pelo menos usado.
      const complementary = MUSCLE_GROUPS.filter((m) => selected.has(m) && !bundle.muscles.includes(m));
      take(complementary);
    }

    if (input.goal === 'Força' && chosen.length) {
      chosen[0] = { ...chosen[0], sets: Math.max(chosen[0].sets, 3) };
    }

    days.push({
      day: key,
      dayLabel: weekDay.label,
      rest: chosen.length === 0,
      sessionLabel: chosen.length ? (bundleLabels.get(bundle.id) ?? null) : null,
      focus,
      minutes: input.minutes,
      exercises: chosen,
    });
  }

  const totalExercises = days.reduce((sum, d) => sum + d.exercises.length, 0);
  const totalSets = days.reduce((sum, d) => sum + d.exercises.reduce((s, e) => s + e.sets, 0), 0);

  return {
    version: 1,
    goal: input.goal,
    level: input.level,
    minutes: input.minutes,
    rotation,
    days,
    totalExercises,
    totalSets,
  };
}

export function isWeeklyPlan(value: unknown): value is WeeklyPlan {
  if (typeof value !== 'object' || value === null) return false;
  const plan = value as Partial<WeeklyPlan>;
  return plan.version === 1 && Array.isArray(plan.days) && plan.days.length === WEEK_DAYS.length;
}
