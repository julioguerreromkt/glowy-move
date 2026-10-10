import { describe, expect, it } from 'vitest';
import {
  REPS_LIMITS,
  SET_LOG_STORAGE_KEY,
  WEIGHT_LIMITS,
  createSet,
  lastSetFor,
  parseLogs,
  prFor,
  removeSet,
  sortLogs,
  upsertSet,
  validateDraft,
  type SetDraft,
  type SetLog,
} from '@/lib/workout-log';

const draft: SetDraft = { exerciseId: 'push-up', exerciseName: 'Flexão de braço', weightKg: 20, reps: 10 };

function fixtureSet(partial: Partial<SetLog>, index: number): SetLog {
  return {
    id: `id-${index}`,
    exerciseId: 'push-up',
    exerciseName: 'Flexão de braço',
    weightKg: 20,
    reps: 10,
    timestamp: 1000 + index,
    ...partial,
  };
}

describe('log de execução de séries', () => {
  it('usa a chave de armazenamento da marca', () => {
    expect(SET_LOG_STORAGE_KEY).toBe('glowy-move-set-log-v1');
  });

  it('valida carga e repetições dentro dos limites', () => {
    expect(validateDraft(draft).ok).toBe(true);
    expect(validateDraft({ ...draft, exerciseId: '' }).ok).toBe(false);
    expect(validateDraft({ ...draft, weightKg: WEIGHT_LIMITS.max + 1 }).ok).toBe(false);
    expect(validateDraft({ ...draft, weightKg: Number.NaN }).ok).toBe(false);
    expect(validateDraft({ ...draft, reps: REPS_LIMITS.min - 1 }).ok).toBe(false);
    expect(validateDraft({ ...draft, reps: 10.5 }).ok).toBe(false);
    // Carga zero é permitida (peso corporal).
    expect(validateDraft({ ...draft, weightKg: 0 }).ok).toBe(true);
  });

  it('cria série com id e timestamp injetáveis', () => {
    const set = createSet(draft, 42, 'fixo');
    expect(set).toEqual({ ...draft, id: 'fixo', timestamp: 42 });
  });

  it('insere nova série e mantém ordem por data decrescente', () => {
    let logs: SetLog[] = [];
    logs = upsertSet(logs, createSet(draft, 100, 'a'));
    logs = upsertSet(logs, createSet(draft, 300, 'b'));
    logs = upsertSet(logs, createSet(draft, 200, 'c'));
    expect(logs.map((l) => l.id)).toEqual(['b', 'c', 'a']);
  });

  it('substitui série existente de mesmo id sem duplicar', () => {
    let logs = upsertSet([], createSet(draft, 100, 'a'));
    logs = upsertSet(logs, { ...createSet(draft, 100, 'a'), weightKg: 55 });
    expect(logs).toHaveLength(1);
    expect(logs[0].weightKg).toBe(55);
  });

  it('remove série por id', () => {
    const logs = [fixtureSet({}, 1), fixtureSet({}, 2)];
    expect(removeSet(logs, 'id-1').map((l) => l.id)).toEqual(['id-2']);
    expect(removeSet(logs, 'inexistente')).toHaveLength(2);
  });

  it('acha a última série de um exercício pela data mais recente', () => {
    const logs = [
      fixtureSet({ id: 'x', exerciseId: 'squat', timestamp: 500 }, 1),
      fixtureSet({ id: 'y', exerciseId: 'squat', timestamp: 900 }, 2),
      fixtureSet({ id: 'z', exerciseId: 'curl', timestamp: 999 }, 3),
    ];
    expect(lastSetFor(logs, 'squat')?.id).toBe('y');
    expect(lastSetFor(logs, 'inexistente')).toBeNull();
  });

  it('calcula o PR como a maior carga do exercício', () => {
    const logs = [
      fixtureSet({ id: 'a', exerciseId: 'squat', weightKg: 60 }, 1),
      fixtureSet({ id: 'b', exerciseId: 'squat', weightKg: 80 }, 2),
      fixtureSet({ id: 'c', exerciseId: 'squat', weightKg: 70 }, 3),
    ];
    expect(prFor(logs, 'squat')).toBe(80);
    expect(prFor(logs, 'inexistente')).toBeNull();
  });

  it('descarta registros inválidos ao ler lista crua', () => {
    const raw = [
      fixtureSet({ id: 'ok' }, 1),
      { id: 'faltando-campos' },
      null,
      { id: 'x', exerciseId: 'y', exerciseName: 'z', weightKg: 'muito', reps: 10, timestamp: 1 },
    ];
    const parsed = parseLogs(raw);
    expect(parsed.map((l) => l.id)).toEqual(['ok']);
    expect(parseLogs('não é lista')).toEqual([]);
  });

  it('ordena sem mutar a lista original', () => {
    const original = [fixtureSet({ id: 'a', timestamp: 1 }, 1), fixtureSet({ id: 'b', timestamp: 2 }, 2)];
    const sorted = sortLogs(original);
    expect(sorted.map((l) => l.id)).toEqual(['b', 'a']);
    expect(original.map((l) => l.id)).toEqual(['a', 'b']);
  });
});
