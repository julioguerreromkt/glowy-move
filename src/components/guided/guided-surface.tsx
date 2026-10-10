'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { CalendarDays, CheckCircle2, ChevronRight, Dumbbell, Flag, Trophy } from 'lucide-react';
import {
  PLAN_STORAGE_KEY,
  isWeeklyPlan,
  type PlannedDay,
  type WeeklyPlan,
} from '@/lib/planner';
import { dayKeyForJsDay, nextTrainingDay, plannedDayFor, targetSets } from '@/lib/guided';
import {
  createSet,
  lastSetFor,
  prFor,
  readLog,
  upsertSet,
  validateDraft,
  writeLog,
  type SetDraft,
  type SetLog,
} from '@/lib/workout-log';
import { RestTimer } from '@/components/guided/rest-timer';

type Phase = 'loading' | 'no-plan' | 'rest' | 'active' | 'done';

function readPlan(): WeeklyPlan | null {
  if (typeof window === 'undefined') return null;
  try {
    const stored = window.localStorage.getItem(PLAN_STORAGE_KEY);
    if (!stored) return null;
    const parsed = JSON.parse(stored) as { plan?: unknown };
    return isWeeklyPlan(parsed?.plan) ? parsed.plan : null;
  } catch {
    return null;
  }
}

function Shell({ children }: { children: React.ReactNode }) {
  return <div className="mx-auto w-full max-w-[900px] px-4 pb-16 pt-10 sm:px-6 sm:pt-14">{children}</div>;
}

export function GuidedSurface() {
  const [phase, setPhase] = useState<Phase>('loading');
  const [today, setToday] = useState<PlannedDay | null>(null);
  const [nextDay, setNextDay] = useState<PlannedDay | null>(null);
  const [logs, setLogs] = useState<SetLog[]>([]);
  const [exerciseIndex, setExerciseIndex] = useState(0);
  const [completed, setCompleted] = useState<number[]>([]);
  const [weight, setWeight] = useState('');
  const [reps, setReps] = useState('');
  const [errors, setErrors] = useState<string[]>([]);
  const [resting, setResting] = useState(false);
  const [restSeconds, setRestSeconds] = useState(60);
  const [prBaseline, setPrBaseline] = useState<Map<string, number | null>>(new Map());
  const [sessionPRs, setSessionPRs] = useState<Set<string>>(new Set());
  const [sessionSets, setSessionSets] = useState(0);

  useEffect(() => {
    const plan = readPlan();
    const initialLogs = readLog();
    setLogs(initialLogs);
    if (!plan) {
      setPhase('no-plan');
      return;
    }
    const key = dayKeyForJsDay(new Date().getDay());
    const day = plannedDayFor(plan, key);
    if (!day || day.rest || day.exercises.length === 0) {
      setNextDay(nextTrainingDay(plan, key));
      setPhase('rest');
      return;
    }
    setToday(day);
    setCompleted(new Array(day.exercises.length).fill(0));
    const baseline = new Map<string, number | null>();
    for (const ex of day.exercises) baseline.set(ex.exerciseId, prFor(initialLogs, ex.exerciseId));
    setPrBaseline(baseline);
    setPhase('active');
  }, []);

  // Pré-preenche a carga com o valor da última vez ao trocar de exercício.
  useEffect(() => {
    if (phase !== 'active' || !today) return;
    const ex = today.exercises[exerciseIndex];
    if (!ex) return;
    const last = lastSetFor(logs, ex.exerciseId);
    setWeight(last ? String(last.weightKg) : '');
    const singleRep = /^\d+$/.test(ex.reps) ? ex.reps : '';
    setReps(last ? String(last.reps) : singleRep);
    setErrors([]);
    // logs fora das dependências de propósito: só pré-preenche na troca de exercício.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exerciseIndex, today, phase]);

  const registerSet = useCallback(() => {
    if (!today) return;
    const ex = today.exercises[exerciseIndex];
    if (!ex) return;
    const draft: SetDraft = {
      exerciseId: ex.exerciseId,
      exerciseName: ex.name,
      weightKg: Number(weight),
      reps: Number(reps),
    };
    const validation = validateDraft(draft);
    setErrors(validation.errors);
    if (!validation.ok) return;

    const set = createSet(draft);
    const nextLogs = upsertSet(logs, set);
    setLogs(nextLogs);
    writeLog(nextLogs);

    const base = prBaseline.get(ex.exerciseId) ?? null;
    if (base === null || set.weightKg > base) {
      setSessionPRs((prev) => new Set(prev).add(ex.exerciseId));
      setPrBaseline((prev) => new Map(prev).set(ex.exerciseId, set.weightKg));
    }

    setSessionSets((n) => n + 1);
    const doneCount = (completed[exerciseIndex] ?? 0) + 1;
    setCompleted((prev) => {
      const next = [...prev];
      next[exerciseIndex] = doneCount;
      return next;
    });

    const isLastExercise = exerciseIndex === today.exercises.length - 1;
    const reachedTarget = doneCount >= targetSets(ex.sets);
    if (!(isLastExercise && reachedTarget)) {
      setRestSeconds(ex.restSeconds > 0 ? ex.restSeconds : 60);
      setResting(true);
    }
  }, [today, exerciseIndex, weight, reps, logs, prBaseline, completed]);

  const goNext = useCallback(() => {
    if (!today) return;
    setResting(false);
    if (exerciseIndex >= today.exercises.length - 1) {
      setPhase('done');
      return;
    }
    setExerciseIndex((i) => i + 1);
  }, [today, exerciseIndex]);

  if (phase === 'loading') {
    return (
      <Shell>
        <p className="text-sm text-muted">Carregando seu treino do dia…</p>
      </Shell>
    );
  }

  if (phase === 'no-plan') {
    return (
      <Shell>
        <p className="eyebrow">TREINO GUIADO</p>
        <h1 className="display mt-4 text-[34px] text-ink sm:text-[46px]">Monte sua rotina primeiro.</h1>
        <p className="mt-4 max-w-xl text-base leading-relaxed text-muted">
          O treino guiado conduz a sessão do dia a partir da sua rotina semanal. Você ainda não tem uma salva neste
          dispositivo.
        </p>
        <Link href="/rotina" className="btn-accent mt-6">
          <CalendarDays aria-hidden="true" className="h-4 w-4" />
          Montar minha rotina
        </Link>
      </Shell>
    );
  }

  if (phase === 'rest') {
    return (
      <Shell>
        <p className="eyebrow">TREINO GUIADO</p>
        <h1 className="display mt-4 text-[34px] text-ink sm:text-[46px]">
          Hoje é dia de <span className="text-cyan">recuperação.</span>
        </h1>
        <p className="mt-4 max-w-xl text-base leading-relaxed text-muted">
          Sua rotina não tem treino marcado para hoje. Caminhada leve, mobilidade ou descanso completo também fazem
          parte.
        </p>
        {nextDay ? (
          <div className="card mt-6 p-5">
            <p className="eyebrow">Próxima sessão</p>
            <h2 className="display mt-2 text-[22px] text-ink">
              {nextDay.dayLabel} · {nextDay.sessionLabel}
            </h2>
            <p className="mt-1 text-sm text-muted">
              {nextDay.focus.join(' · ')} · {nextDay.exercises.length} exercícios
            </p>
          </div>
        ) : (
          <p className="mt-6 text-sm text-muted">Nenhum treino marcado na semana. Ajuste sua rotina quando quiser.</p>
        )}
        <Link href="/rotina" className="btn-ghost mt-6">
          Ver minha rotina
        </Link>
      </Shell>
    );
  }

  if (phase === 'done') {
    const prCount = sessionPRs.size;
    return (
      <Shell>
        <p className="eyebrow">TREINO GUIADO</p>
        <h1 className="display mt-4 text-[34px] text-ink sm:text-[46px]">
          Treino <span className="text-cyan">concluído.</span>
        </h1>
        <div className="card mt-6 p-6">
          <div className="flex items-center gap-3">
            <CheckCircle2 aria-hidden="true" className="h-6 w-6 text-cyan" />
            <p className="text-ink">
              <span className="font-semibold">{sessionSets}</span>{' '}
              {sessionSets === 1 ? 'série registrada' : 'séries registradas'} hoje.
            </p>
          </div>
          {prCount > 0 ? (
            <div className="mt-3 flex items-center gap-3">
              <Trophy aria-hidden="true" className="h-6 w-6 text-cyan" />
              <p className="text-ink">
                <span className="font-semibold">{prCount}</span>{' '}
                {prCount === 1 ? 'novo recorde de carga' : 'novos recordes de carga'} nesta sessão.
              </p>
            </div>
          ) : null}
        </div>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/registro" className="btn-accent">
            Ver meu registro
          </Link>
          <Link href="/rotina" className="btn-ghost">
            Minha rotina
          </Link>
        </div>
      </Shell>
    );
  }

  // phase === 'active'
  const exercises = today?.exercises ?? [];
  const exercise = exercises[exerciseIndex];
  if (!exercise) {
    return (
      <Shell>
        <p className="text-sm text-muted">Sem exercícios neste treino.</p>
      </Shell>
    );
  }
  const target = targetSets(exercise.sets);
  const doneCount = completed[exerciseIndex] ?? 0;
  const reachedTarget = doneCount >= target;
  const isLastExercise = exerciseIndex === exercises.length - 1;
  const baseline = prBaseline.get(exercise.exerciseId) ?? null;
  const isPr = sessionPRs.has(exercise.exerciseId);
  const last = lastSetFor(logs, exercise.exerciseId);

  return (
    <Shell>
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="eyebrow">{today?.dayLabel} · {today?.sessionLabel}</p>
          <h1 className="display mt-2 text-[28px] text-ink sm:text-[34px]">Treino guiado</h1>
        </div>
        <span className="pill">
          Exercício {exerciseIndex + 1} de {exercises.length}
        </span>
      </div>

      <section className="card mt-8 p-5 sm:p-7">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Dumbbell aria-hidden="true" className="h-4 w-4 text-subtle" />
              <h2 className="display text-[24px] text-ink">{exercise.name}</h2>
            </div>
            <p className="mt-1 text-sm text-muted">
              {exercise.muscleGroup} · {exercise.equipment}
            </p>
          </div>
          {isPr ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-cyan px-3 py-1.5 text-xs font-semibold text-canvas" aria-live="polite">
              <Trophy aria-hidden="true" className="h-3.5 w-3.5" />
              Novo recorde
            </span>
          ) : null}
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
          <span className="text-muted">
            Meta: <span className="text-ink">{target} séries × {exercise.reps} reps</span>
          </span>
          <span className="text-muted">
            Recorde: <span className="text-ink">{baseline !== null ? `${baseline} kg` : 'sem registro'}</span>
          </span>
          {last ? (
            <span className="text-muted">
              Última vez: <span className="text-ink">{last.weightKg} kg × {last.reps}</span>
            </span>
          ) : null}
        </div>

        <div className="mt-5 flex items-center gap-1.5" aria-label={`${doneCount} de ${target} séries feitas`}>
          {Array.from({ length: target }).map((_, i) => (
            <span
              key={i}
              aria-hidden="true"
              className={`h-2.5 w-2.5 rounded-full ${i < doneCount ? 'bg-cyan' : 'bg-line'}`}
            />
          ))}
          <span className="ml-2 text-xs text-subtle">
            {doneCount}/{target} séries
          </span>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="g-carga" className="eyebrow">
              Carga (kg)
            </label>
            <input
              id="g-carga"
              type="number"
              inputMode="decimal"
              step="0.5"
              min={0}
              value={weight}
              onChange={(event) => setWeight(event.target.value)}
              className="field mt-2"
              placeholder="Ex.: 40"
            />
          </div>
          <div>
            <label htmlFor="g-reps" className="eyebrow">
              Repetições
            </label>
            <input
              id="g-reps"
              type="number"
              inputMode="numeric"
              min={1}
              value={reps}
              onChange={(event) => setReps(event.target.value)}
              className="field mt-2"
              placeholder="Ex.: 10"
            />
          </div>
        </div>

        {errors.length ? (
          <ul role="alert" className="mt-4 space-y-1 rounded-lg bg-elevated p-4 text-sm text-ink">
            {errors.map((message) => (
              <li key={message}>{message}</li>
            ))}
          </ul>
        ) : null}

        <div className="mt-5 flex flex-wrap gap-3">
          <button type="button" onClick={registerSet} className="btn-accent">
            <CheckCircle2 aria-hidden="true" className="h-4 w-4" />
            Registrar série {Math.min(doneCount + 1, target)}/{target}
          </button>
          {reachedTarget ? (
            isLastExercise ? (
              <button type="button" onClick={() => setPhase('done')} className="btn-primary">
                <Flag aria-hidden="true" className="h-4 w-4" />
                Finalizar treino
              </button>
            ) : (
              <button type="button" onClick={goNext} className="btn-primary">
                Próximo exercício
                <ChevronRight aria-hidden="true" className="h-4 w-4" />
              </button>
            )
          ) : !isLastExercise ? (
            <button type="button" onClick={goNext} className="btn-ghost">
              Pular para o próximo
            </button>
          ) : null}
        </div>

        {resting ? (
          <div className="mt-6">
            <RestTimer seconds={restSeconds} onDone={() => setResting(false)} />
          </div>
        ) : null}
      </section>

      <ol className="mt-6 grid gap-2">
        {exercises.map((ex, i) => (
          <li
            key={ex.exerciseId}
            className={`flex items-center justify-between rounded-lg border px-4 py-2.5 text-sm ${
              i === exerciseIndex ? 'border-cyan bg-elevated text-ink' : 'border-line bg-surface text-muted'
            }`}
          >
            <span className="flex items-center gap-2">
              {(completed[i] ?? 0) >= targetSets(ex.sets) ? (
                <CheckCircle2 aria-hidden="true" className="h-4 w-4 text-cyan" />
              ) : (
                <span aria-hidden="true" className="inline-block h-4 w-4 text-center text-xs text-subtle">
                  {i + 1}
                </span>
              )}
              {ex.name}
            </span>
            <span className="text-xs text-subtle">
              {completed[i] ?? 0}/{targetSets(ex.sets)}
            </span>
          </li>
        ))}
      </ol>
    </Shell>
  );
}
