'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ClipboardList, Pencil, Plus, RotateCcw, Trash2, X } from 'lucide-react';
import { MUSCLE_GROUPS, type Exercise, type MuscleGroup } from '@/lib/types';
import {
  createSet,
  lastSetFor,
  prFor,
  readLog,
  removeSet,
  upsertSet,
  validateDraft,
  writeLog,
  type SetDraft,
  type SetLog,
} from '@/lib/workout-log';

interface EditingState {
  id: string;
  timestamp: number;
}

const EMPTY_FORM = { exerciseId: '', weight: '', reps: '' };

export function LogSurface({ exercises }: { exercises: Exercise[] }) {
  const [logs, setLogs] = useState<SetLog[]>([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editing, setEditing] = useState<EditingState | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [lastDeleted, setLastDeleted] = useState<SetLog | null>(null);
  const undoTimer = useRef<number | null>(null);

  useEffect(() => {
    setLogs(readLog());
  }, []);

  useEffect(() => {
    return () => {
      if (undoTimer.current !== null) window.clearTimeout(undoTimer.current);
    };
  }, []);

  const nameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const exercise of exercises) map.set(exercise.id, exercise.name);
    return map;
  }, [exercises]);

  const byGroup = useMemo(() => {
    const groups = new Map<MuscleGroup, Exercise[]>();
    for (const exercise of exercises) {
      const list = groups.get(exercise.muscleGroup) ?? [];
      list.push(exercise);
      groups.set(exercise.muscleGroup, list);
    }
    return groups;
  }, [exercises]);

  const dateFormat = useMemo(
    () =>
      new Intl.DateTimeFormat('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }),
    [],
  );

  const persist = useCallback((next: SetLog[]) => {
    setLogs(next);
    writeLog(next);
  }, []);

  const resetForm = useCallback(() => {
    setForm(EMPTY_FORM);
    setEditing(null);
    setErrors([]);
  }, []);

  const hint = useMemo(() => {
    if (!form.exerciseId) return null;
    const last = lastSetFor(logs, form.exerciseId);
    const record = prFor(logs, form.exerciseId);
    if (!last && record === null) return null;
    return { last, record };
  }, [form.exerciseId, logs]);

  const submit = useCallback(
    (event: React.FormEvent) => {
      event.preventDefault();
      const draft: SetDraft = {
        exerciseId: form.exerciseId,
        exerciseName: nameById.get(form.exerciseId) ?? '',
        weightKg: Number(form.weight),
        reps: Number(form.reps),
      };
      const validation = validateDraft(draft);
      setErrors(validation.errors);
      if (!validation.ok) return;

      const set: SetLog = editing
        ? { id: editing.id, timestamp: editing.timestamp, ...draft }
        : createSet(draft);
      persist(upsertSet(logs, set));
      resetForm();
    },
    [editing, form, logs, nameById, persist, resetForm],
  );

  const startEdit = useCallback((log: SetLog) => {
    setEditing({ id: log.id, timestamp: log.timestamp });
    setForm({ exerciseId: log.exerciseId, weight: String(log.weightKg), reps: String(log.reps) });
    setErrors([]);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const remove = useCallback(
    (log: SetLog) => {
      persist(removeSet(logs, log.id));
      if (editing?.id === log.id) resetForm();
      setLastDeleted(log);
      if (undoTimer.current !== null) window.clearTimeout(undoTimer.current);
      undoTimer.current = window.setTimeout(() => setLastDeleted(null), 7000);
    },
    [editing, logs, persist, resetForm],
  );

  const undo = useCallback(() => {
    if (!lastDeleted) return;
    persist(upsertSet(logs, lastDeleted));
    setLastDeleted(null);
    if (undoTimer.current !== null) window.clearTimeout(undoTimer.current);
  }, [lastDeleted, logs, persist]);

  return (
    <div className="mx-auto w-full max-w-[1180px] px-4 pb-16 pt-10 sm:px-6 sm:pt-14">
      <section>
        <p className="eyebrow">REGISTRO DE SÉRIES</p>
        <span aria-hidden="true" className="mt-3 block h-px w-14 bg-line" />
        <h1 className="display mt-5 max-w-3xl text-[40px] text-ink sm:text-[58px]">
          O que você <span className="text-cyan">levantou.</span>
        </h1>
        <p className="mt-5 max-w-2xl text-base leading-relaxed text-muted sm:text-lg">
          Anote cada série com a carga e as repetições. Fica tudo neste aparelho, sem conta e sem servidor. É daqui que
          saem o peso da última vez e o seu recorde.
        </p>
        <span className="pill mt-6">
          <ClipboardList aria-hidden="true" className="h-3.5 w-3.5 text-subtle" />
          Guardado só neste dispositivo
        </span>
      </section>

      <section aria-labelledby="form-registro" className="mt-10 card p-5 sm:p-7">
        <h2 id="form-registro" className="display text-[24px] text-ink">
          {editing ? 'Editar série' : 'Registrar série'}
        </h2>

        <form onSubmit={submit} className="mt-6 grid gap-5">
          <div>
            <label htmlFor="exercicio" className="eyebrow">
              Exercício
            </label>
            <select
              id="exercicio"
              value={form.exerciseId}
              onChange={(event) => setForm((prev) => ({ ...prev, exerciseId: event.target.value }))}
              className="field mt-2"
            >
              <option value="">Escolha um exercício</option>
              {MUSCLE_GROUPS.filter((group) => byGroup.has(group)).map((group) => (
                <optgroup key={group} label={group}>
                  {(byGroup.get(group) ?? []).map((exercise) => (
                    <option key={exercise.id} value={exercise.id}>
                      {exercise.name}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label htmlFor="carga" className="eyebrow">
                Carga (kg)
              </label>
              <input
                id="carga"
                type="number"
                inputMode="decimal"
                step="0.5"
                min={0}
                value={form.weight}
                onChange={(event) => setForm((prev) => ({ ...prev, weight: event.target.value }))}
                className="field mt-2"
                placeholder="Ex.: 40"
              />
            </div>
            <div>
              <label htmlFor="reps" className="eyebrow">
                Repetições
              </label>
              <input
                id="reps"
                type="number"
                inputMode="numeric"
                min={1}
                value={form.reps}
                onChange={(event) => setForm((prev) => ({ ...prev, reps: event.target.value }))}
                className="field mt-2"
                placeholder="Ex.: 10"
              />
            </div>
          </div>

          {hint ? (
            <p className="text-xs text-muted">
              {hint.last ? (
                <>
                  Última vez: <span className="text-ink">{hint.last.weightKg} kg × {hint.last.reps}</span>
                </>
              ) : (
                'Sem registro anterior deste exercício.'
              )}
              {hint.record !== null ? (
                <>
                  {' · '}
                  Recorde de carga: <span className="text-ink">{hint.record} kg</span>
                </>
              ) : null}
            </p>
          ) : null}

          {errors.length ? (
            <ul role="alert" className="space-y-1 rounded-lg bg-elevated p-4 text-sm text-ink">
              {errors.map((message) => (
                <li key={message}>{message}</li>
              ))}
            </ul>
          ) : null}

          <div className="flex flex-wrap gap-3">
            <button type="submit" className="btn-accent">
              <Plus aria-hidden="true" className="h-4 w-4" />
              {editing ? 'Salvar alteração' : 'Registrar série'}
            </button>
            {editing ? (
              <button type="button" onClick={resetForm} className="btn-ghost">
                <X aria-hidden="true" className="h-4 w-4" />
                Cancelar edição
              </button>
            ) : null}
          </div>
        </form>
      </section>

      <section aria-labelledby="historico" className="mt-12">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="eyebrow">Histórico</p>
            <h2 id="historico" className="display mt-2 text-[30px] text-ink sm:text-[38px]">
              {logs.length} {logs.length === 1 ? 'série registrada' : 'séries registradas'}
            </h2>
          </div>
        </div>

        {logs.length === 0 ? (
          <p className="mt-6 rounded-card border border-line bg-surface p-6 text-sm text-muted">
            Nada registrado ainda. Faça uma série, anote a carga e as repetições, e ela aparece aqui.
          </p>
        ) : (
          <ul className="mt-6 card divide-y divide-line">
            {logs.map((log) => (
              <li key={log.id} className="flex flex-wrap items-center justify-between gap-3 p-4 sm:px-6">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-ink">{log.exerciseName || nameById.get(log.exerciseId) || 'Exercício'}</p>
                  <p className="mt-0.5 text-xs text-muted">{dateFormat.format(new Date(log.timestamp))}</p>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-sm text-ink">
                    <span className="font-semibold">{log.weightKg} kg</span>
                    <span className="text-muted"> × {log.reps}</span>
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => startEdit(log)}
                      aria-label={`Editar série de ${log.exerciseName}`}
                      className="rounded-full border border-line bg-surface p-2 text-subtle transition-colors hover:bg-elevated hover:text-ink"
                    >
                      <Pencil aria-hidden="true" className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => remove(log)}
                      aria-label={`Excluir série de ${log.exerciseName}`}
                      className="rounded-full border border-line bg-surface p-2 text-subtle transition-colors hover:bg-elevated hover:text-ink"
                    >
                      <Trash2 aria-hidden="true" className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-3 bottom-4 z-50 flex justify-center sm:inset-x-0"
      >
        {lastDeleted ? (
          <div className="rise pointer-events-auto flex w-full max-w-md items-center gap-3 rounded-card border border-line bg-elevated px-4 py-3 text-ink shadow-overlay">
            <Trash2 aria-hidden="true" className="h-4 w-4 shrink-0 text-subtle" />
            <p className="min-w-0 flex-1 text-sm">
              Série de <span className="font-semibold">{lastDeleted.exerciseName}</span> excluída.
            </p>
            <button type="button" onClick={undo} className="inline-flex items-center gap-1.5 rounded-full bg-cyan px-3 py-1.5 text-xs font-semibold text-canvas transition-colors hover:bg-cyan-deep">
              <RotateCcw aria-hidden="true" className="h-3.5 w-3.5" />
              Desfazer
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
