/**
 * Lógica do treino guiado, separada da interface para ficar testável.
 * Decide qual é o treino do dia a partir da rotina salva e qual é a próxima
 * sessão quando hoje é dia de descanso.
 */

import { WEEK_DAYS, type DayKey, type PlannedDay, type WeeklyPlan } from '@/lib/planner';

/** Date.getDay(): 0 domingo ... 6 sábado. Mapeia para as chaves da semana. */
export const JS_DAY_TO_KEY: Record<number, DayKey> = {
  0: 'DOM',
  1: 'SEG',
  2: 'TER',
  3: 'QUA',
  4: 'QUI',
  5: 'SEX',
  6: 'SAB',
};

export function dayKeyForJsDay(jsDay: number): DayKey {
  return JS_DAY_TO_KEY[jsDay] ?? 'SEG';
}

export function plannedDayFor(plan: WeeklyPlan, key: DayKey): PlannedDay | null {
  return plan.days.find((day) => day.day === key) ?? null;
}

/** Próximo dia de treino a partir de uma chave, dando a volta na semana. */
export function nextTrainingDay(plan: WeeklyPlan, fromKey: DayKey): PlannedDay | null {
  const order = WEEK_DAYS.map((d) => d.key) as DayKey[];
  const start = order.indexOf(fromKey);
  if (start === -1) return null;
  for (let step = 1; step <= order.length; step += 1) {
    const key = order[(start + step) % order.length];
    const day = plan.days.find((d) => d.day === key);
    if (day && !day.rest && day.exercises.length > 0) return day;
  }
  return null;
}

/** Quantidade alvo de séries de um exercício dentro do treino guiado. */
export function targetSets(exerciseSets: number): number {
  return Math.max(1, Math.round(exerciseSets));
}
