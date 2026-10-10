/**
 * Log de execução de séries, guardado no dispositivo.
 *
 * Mesma decisão do planejador: o estado do usuário mora no localStorage do
 * navegador, com fallback silencioso quando o armazenamento não está
 * disponível. Nada é enviado para fora do aparelho. O núcleo é um conjunto de
 * funções puras sobre listas, para ficar testável sem DOM.
 */

/** Uma série registrada: exercício, carga, repetições e quando foi feita. */
export interface SetLog {
  id: string;
  exerciseId: string;
  /** Nome no momento do registro, para a tabela não depender do catálogo. */
  exerciseName: string;
  weightKg: number;
  reps: number;
  /** Epoch em milissegundos. */
  timestamp: number;
}

/** Campos que a pessoa preenche; id e data são atribuídos ao registrar. */
export interface SetDraft {
  exerciseId: string;
  exerciseName: string;
  weightKg: number;
  reps: number;
}

export const SET_LOG_STORAGE_KEY = 'glowy-move-set-log-v1';

export const WEIGHT_LIMITS = { min: 0, max: 1000 } as const;
export const REPS_LIMITS = { min: 1, max: 100 } as const;

export interface DraftValidation {
  ok: boolean;
  errors: string[];
}

export function validateDraft(draft: SetDraft): DraftValidation {
  const errors: string[] = [];
  if (!draft.exerciseId) errors.push('Escolha um exercício.');
  if (!Number.isFinite(draft.weightKg) || draft.weightKg < WEIGHT_LIMITS.min || draft.weightKg > WEIGHT_LIMITS.max) {
    errors.push(`Informe a carga entre ${WEIGHT_LIMITS.min} e ${WEIGHT_LIMITS.max} kg.`);
  }
  if (!Number.isInteger(draft.reps) || draft.reps < REPS_LIMITS.min || draft.reps > REPS_LIMITS.max) {
    errors.push(`Informe as repetições entre ${REPS_LIMITS.min} e ${REPS_LIMITS.max}.`);
  }
  return { ok: errors.length === 0, errors };
}

function newId(): string {
  try {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
  } catch {
    /* ambiente sem crypto: cai no id manual abaixo */
  }
  return `set-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

/** Cria uma série a partir do rascunho. id e timestamp injetáveis para teste. */
export function createSet(draft: SetDraft, timestamp: number = Date.now(), id: string = newId()): SetLog {
  return {
    id,
    exerciseId: draft.exerciseId,
    exerciseName: draft.exerciseName,
    weightKg: draft.weightKg,
    reps: draft.reps,
    timestamp,
  };
}

/** Insere nova série ou substitui a de mesmo id. Resultado ordenado por data desc. */
export function upsertSet(logs: SetLog[], set: SetLog): SetLog[] {
  const without = logs.filter((log) => log.id !== set.id);
  return sortLogs([set, ...without]);
}

export function removeSet(logs: SetLog[], id: string): SetLog[] {
  return logs.filter((log) => log.id !== id);
}

export function sortLogs(logs: SetLog[]): SetLog[] {
  return [...logs].sort((a, b) => b.timestamp - a.timestamp);
}

/** Série mais recente de um exercício. Base da carga pré-preenchida no treino guiado. */
export function lastSetFor(logs: SetLog[], exerciseId: string): SetLog | null {
  let best: SetLog | null = null;
  for (const log of logs) {
    if (log.exerciseId !== exerciseId) continue;
    if (!best || log.timestamp > best.timestamp) best = log;
  }
  return best;
}

/** Recorde de carga de um exercício: maior peso já registrado. null se não houver. */
export function prFor(logs: SetLog[], exerciseId: string): number | null {
  let max: number | null = null;
  for (const log of logs) {
    if (log.exerciseId !== exerciseId) continue;
    if (max === null || log.weightKg > max) max = log.weightKg;
  }
  return max;
}

export function isSetLog(value: unknown): value is SetLog {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.id === 'string' &&
    typeof v.exerciseId === 'string' &&
    typeof v.exerciseName === 'string' &&
    typeof v.weightKg === 'number' &&
    Number.isFinite(v.weightKg) &&
    typeof v.reps === 'number' &&
    Number.isFinite(v.reps) &&
    typeof v.timestamp === 'number' &&
    Number.isFinite(v.timestamp)
  );
}

/** Lê e valida uma lista crua, descartando registros inválidos. */
export function parseLogs(raw: unknown): SetLog[] {
  if (!Array.isArray(raw)) return [];
  return sortLogs(raw.filter(isSetLog));
}

// --- Armazenamento local (navegador). SSR e modo privado não quebram. ---

export function readLog(): SetLog[] {
  if (typeof window === 'undefined') return [];
  try {
    const stored = window.localStorage.getItem(SET_LOG_STORAGE_KEY);
    if (!stored) return [];
    const parsed = JSON.parse(stored) as { version?: number; sets?: unknown };
    return parseLogs(parsed?.sets);
  } catch {
    return [];
  }
}

export function writeLog(logs: SetLog[]): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(SET_LOG_STORAGE_KEY, JSON.stringify({ version: 1, sets: logs }));
  } catch {
    /* modo privado ou armazenamento cheio: a tela segue com os dados em memória */
  }
}
