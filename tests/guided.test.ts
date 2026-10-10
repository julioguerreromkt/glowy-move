import { describe, expect, it } from 'vitest';
import { EXERCISE_CATALOG } from '@/lib/catalog';
import { buildPresetPlan, findPreset } from '@/lib/plans/presets';
import { dayKeyForJsDay, nextTrainingDay, plannedDayFor, targetSets } from '@/lib/guided';

// PPL treina SEG, QUA e SEX; os demais são descanso.
const plan = buildPresetPlan(findPreset('ppl')!, EXERCISE_CATALOG);

describe('treino guiado', () => {
  it('mapeia o dia do Date.getDay para a chave da semana', () => {
    expect(dayKeyForJsDay(0)).toBe('DOM');
    expect(dayKeyForJsDay(1)).toBe('SEG');
    expect(dayKeyForJsDay(6)).toBe('SAB');
  });

  it('acha o dia planejado por chave', () => {
    expect(plannedDayFor(plan, 'SEG')?.rest).toBe(false);
    expect(plannedDayFor(plan, 'TER')?.rest).toBe(true);
    expect(plannedDayFor(plan, 'SEG')?.sessionLabel).toBe('Push');
  });

  it('encontra o próximo treino, dando a volta na semana', () => {
    expect(nextTrainingDay(plan, 'SEG')?.day).toBe('QUA');
    expect(nextTrainingDay(plan, 'TER')?.day).toBe('QUA');
    expect(nextTrainingDay(plan, 'QUA')?.day).toBe('SEX');
    // Depois de sexta, o próximo treino é segunda da semana seguinte.
    expect(nextTrainingDay(plan, 'SEX')?.day).toBe('SEG');
    expect(nextTrainingDay(plan, 'SAB')?.day).toBe('SEG');
  });

  it('retorna null quando não há nenhum dia de treino', () => {
    const empty = { ...plan, days: plan.days.map((d) => ({ ...d, rest: true, exercises: [] })) };
    expect(nextTrainingDay(empty, 'SEG')).toBeNull();
  });

  it('normaliza a quantidade de séries alvo', () => {
    expect(targetSets(3)).toBe(3);
    expect(targetSets(0)).toBe(1);
    expect(targetSets(5)).toBe(5);
  });
});
