'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { CalendarDays, Cpu, RefreshCw, Shuffle, Sparkles } from 'lucide-react';
import {
  DEFAULT_PLANNER_INPUT,
  GOALS,
  HEIGHT_RANGE,
  LEGACY_PLAN_STORAGE_KEY,
  LEVELS,
  PLAN_STORAGE_KEY,
  SESSION_MINUTES,
  WEEK_DAYS,
  WEIGHT_RANGE,
  generateWeeklyPlan,
  isWeeklyPlan,
  validatePlannerInput,
  type DayKey,
  type Goal,
  type Level,
  type PlannerInput,
  type SessionMinutes,
  type WeeklyPlan,
} from '@/lib/planner';
import { MUSCLE_GROUPS, type Exercise, type MuscleGroup } from '@/lib/types';

function Chip({
  active,
  children,
  onClick,
  label,
}: {
  active: boolean;
  children: React.ReactNode;
  onClick: () => void;
  label?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      aria-label={label}
      className={`whitespace-nowrap rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
        active ? 'chip-on' : 'chip-off'
      }`}
    >
      {children}
    </button>
  );
}

export function PlannerSurface({ exercises }: { exercises: Exercise[] }) {
  const [input, setInput] = useState<PlannerInput>(DEFAULT_PLANNER_INPUT);
  const [plan, setPlan] = useState<WeeklyPlan | null>(null);
  const [rotation, setRotation] = useState(0);
  const [errors, setErrors] = useState<string[]>([]);
  const [restored, setRestored] = useState(false);

  useEffect(() => {
    try {
      // Migra uma vez a rotina salva antes da marca Glowy Move.
      const legacy = window.localStorage.getItem(LEGACY_PLAN_STORAGE_KEY);
      if (legacy && !window.localStorage.getItem(PLAN_STORAGE_KEY)) {
        window.localStorage.setItem(PLAN_STORAGE_KEY, legacy);
        window.localStorage.removeItem(LEGACY_PLAN_STORAGE_KEY);
      }
      const stored = window.localStorage.getItem(PLAN_STORAGE_KEY);
      if (!stored) return;
      const parsed = JSON.parse(stored) as { plan?: unknown };
      if (isWeeklyPlan(parsed?.plan)) {
        setPlan(parsed.plan);
        setRotation(parsed.plan.rotation);
        setRestored(true);
      }
    } catch {
      /* armazenamento indisponível ou conteúdo inválido: segue sem rotina salva */
    }
  }, []);

  const persist = useCallback((next: WeeklyPlan) => {
    try {
      // Só a rotina é guardada. Altura e peso ficam apenas em memória, nesta aba.
      window.localStorage.setItem(PLAN_STORAGE_KEY, JSON.stringify({ version: 1, plan: next }));
    } catch {
      /* modo privado ou armazenamento cheio: a rotina segue visível na tela */
    }
  }, []);

  const build = useCallback(
    (nextRotation: number) => {
      const validation = validatePlannerInput(input);
      setErrors(validation.errors);
      if (!validation.ok) return;
      const next = generateWeeklyPlan(input, exercises, nextRotation);
      setPlan(next);
      setRotation(nextRotation);
      setRestored(false);
      persist(next);
    },
    [exercises, input, persist],
  );

  const toggleDay = (day: DayKey) => {
    setInput((prev) => ({
      ...prev,
      days: prev.days.includes(day) ? prev.days.filter((d) => d !== day) : [...prev.days, day],
    }));
  };

  const toggleMuscle = (muscle: MuscleGroup) => {
    setInput((prev) => ({
      ...prev,
      muscles: prev.muscles.includes(muscle)
        ? prev.muscles.filter((m) => m !== muscle)
        : [...prev.muscles, muscle],
    }));
  };

  const trainingDays = useMemo(() => plan?.days.filter((d) => !d.rest) ?? [], [plan]);

  return (
    <div className="mx-auto w-full max-w-[1180px] px-4 pb-16 pt-10 sm:px-6 sm:pt-14">
      <section>
        <p className="eyebrow">PLANEJADOR SEMANAL</p>
        <span aria-hidden="true" className="mt-3 block h-px w-14 bg-line" />
        <h1 className="display mt-5 max-w-3xl text-[40px] text-ink sm:text-[58px]">
          Sua rotina. <span className="text-cyan">Do seu jeito.</span>
        </h1>
        <p className="mt-5 max-w-2xl text-base leading-relaxed text-muted sm:text-lg">
          Informe seus dados, escolha os dias e os músculos que quer priorizar. A distribuição é montada por regras
          claras, aqui mesmo no navegador.
        </p>
        <span className="pill mt-6">
          <Cpu aria-hidden="true" className="h-3.5 w-3.5 text-subtle" />
          Planejamento inteligente no dispositivo
        </span>
      </section>

      <section aria-labelledby="form-rotina" className="mt-10 card p-5 sm:p-7">
        <h2 id="form-rotina" className="display text-[24px] text-ink">
          Seus parâmetros
        </h2>

        <div className="mt-6 grid gap-5 sm:grid-cols-2">
          <div>
            <label htmlFor="altura" className="eyebrow">
              Altura (cm)
            </label>
            <input
              id="altura"
              type="number"
              inputMode="numeric"
              min={HEIGHT_RANGE.min}
              max={HEIGHT_RANGE.max}
              value={input.heightCm}
              onChange={(event) => setInput((prev) => ({ ...prev, heightCm: Number(event.target.value) }))}
              className="field mt-2"
            />
          </div>
          <div>
            <label htmlFor="peso" className="eyebrow">
              Peso (kg)
            </label>
            <input
              id="peso"
              type="number"
              inputMode="numeric"
              min={WEIGHT_RANGE.min}
              max={WEIGHT_RANGE.max}
              value={input.weightKg}
              onChange={(event) => setInput((prev) => ({ ...prev, weightKg: Number(event.target.value) }))}
              className="field mt-2"
            />
          </div>
        </div>

        <p className="mt-3 text-xs text-muted">Seus dados físicos não são enviados para serviços externos.</p>

        <fieldset className="mt-7">
          <legend className="eyebrow">Objetivo</legend>
          <div className="mt-2 flex flex-wrap gap-2">
            {GOALS.map((goal: Goal) => (
              <Chip key={goal} active={input.goal === goal} onClick={() => setInput((p) => ({ ...p, goal }))}>
                {goal}
              </Chip>
            ))}
          </div>
        </fieldset>

        <fieldset className="mt-6">
          <legend className="eyebrow">Experiência</legend>
          <div className="mt-2 flex flex-wrap gap-2">
            {LEVELS.map((level: Level) => (
              <Chip key={level} active={input.level === level} onClick={() => setInput((p) => ({ ...p, level }))}>
                {level}
              </Chip>
            ))}
          </div>
        </fieldset>

        <fieldset className="mt-6">
          <legend className="eyebrow">Tempo por treino</legend>
          <div className="mt-2 flex flex-wrap gap-2">
            {SESSION_MINUTES.map((minutes: SessionMinutes) => (
              <Chip
                key={minutes}
                active={input.minutes === minutes}
                onClick={() => setInput((p) => ({ ...p, minutes }))}
                label={`${minutes} minutos por treino`}
              >
                {minutes} min
              </Chip>
            ))}
          </div>
        </fieldset>

        <fieldset className="mt-6">
          <legend className="eyebrow">Dias de treino</legend>
          <div className="mt-2 grid grid-cols-4 gap-2 sm:grid-cols-7">
            {WEEK_DAYS.map((day) => {
              const active = input.days.includes(day.key);
              return (
                <button
                  key={day.key}
                  type="button"
                  onClick={() => toggleDay(day.key)}
                  aria-pressed={active}
                  aria-label={day.label}
                  className={`rounded-lg border px-2 py-3 text-center text-sm font-semibold transition-colors ${
                    active ? 'border-cyan bg-elevated text-ink' : 'border-line bg-elevated text-muted hover:border-muted'
                  }`}
                >
                  {day.key}
                </button>
              );
            })}
          </div>
        </fieldset>

        <fieldset className="mt-6">
          <legend className="eyebrow">Músculos em foco</legend>
          <div className="mt-2 flex flex-wrap gap-2">
            {MUSCLE_GROUPS.map((muscle) => (
              <Chip key={muscle} active={input.muscles.includes(muscle)} onClick={() => toggleMuscle(muscle)}>
                {muscle}
              </Chip>
            ))}
          </div>
        </fieldset>

        {errors.length ? (
          <ul role="alert" className="mt-6 space-y-1 rounded-lg bg-elevated p-4 text-sm text-ink">
            {errors.map((message) => (
              <li key={message}>{message}</li>
            ))}
          </ul>
        ) : null}

        <div className="mt-7 flex flex-wrap gap-3">
          <button type="button" onClick={() => build(0)} className="btn-accent">
            <Sparkles aria-hidden="true" className="h-4 w-4" />
            Gerar minha rotina inteligente
          </button>
          {plan ? (
            <>
              <button type="button" onClick={() => build(rotation)} className="btn-ghost">
                <RefreshCw aria-hidden="true" className="h-4 w-4" />
                Refazer minha rotina
              </button>
              <button type="button" onClick={() => build(rotation + 1)} className="btn-ghost">
                <Shuffle aria-hidden="true" className="h-4 w-4" />
                Reorganizar
              </button>
              <Link href="/exercicios" className="btn-ghost">
                Ver vídeos dos exercícios
              </Link>
            </>
          ) : null}
        </div>
      </section>

      {plan ? (
        <section aria-labelledby="rotina-gerada" className="mt-12">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="eyebrow">Semana montada</p>
              <h2 id="rotina-gerada" className="display mt-2 text-[30px] text-ink sm:text-[38px]">
                {trainingDays.length} {trainingDays.length === 1 ? 'treino' : 'treinos'} na semana
              </h2>
              <p className="mt-2 text-sm text-muted">
                {plan.goal} · {plan.level} · {plan.minutes} min por sessão · {plan.totalExercises} exercícios e{' '}
                {plan.totalSets} séries no total.
              </p>
            </div>
            {restored ? (
              <span className="pill">
                <CalendarDays aria-hidden="true" className="h-3.5 w-3.5 text-subtle" />
                Rotina salva neste dispositivo
              </span>
            ) : null}
          </div>

          <ul className="mt-6 grid gap-4 lg:grid-cols-2">
            {plan.days.map((day) => (
              <li key={day.day} className="card p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="eyebrow">{day.dayLabel}</p>
                    <h3 className="display mt-1 text-[22px] text-ink">
                      {day.rest ? 'Recuperação' : day.sessionLabel}
                    </h3>
                    {!day.rest ? (
                      <p className="mt-1 text-xs text-muted">
                        {day.focus.join(' · ')} · {day.minutes} min
                      </p>
                    ) : (
                      <p className="mt-1 text-xs text-muted">
                        Dia livre. Caminhada leve, mobilidade ou descanso completo.
                      </p>
                    )}
                  </div>
                  {!day.rest ? (
                    <span className="rounded-full bg-elevated px-2.5 py-1 text-[11px] font-semibold text-subtle">
                      {day.exercises.length} exercícios
                    </span>
                  ) : null}
                </div>

                {!day.rest ? (
                  <ul className="mt-4 divide-y divide-line">
                    {day.exercises.map((exercise) => (
                      <li key={exercise.exerciseId} className="py-3">
                        <div className="flex flex-wrap items-baseline justify-between gap-2">
                          <span className="text-sm font-semibold text-ink">{exercise.name}</span>
                          <span className="text-xs text-muted">
                            {exercise.sets} x {exercise.reps} · descanso {exercise.restSeconds}s
                          </span>
                        </div>
                        <p className="mt-0.5 text-xs text-muted">
                          {exercise.muscleGroup} · {exercise.equipment}
                        </p>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </li>
            ))}
          </ul>

          <p className="mt-6 rounded-card border border-line bg-surface p-4 text-xs leading-relaxed text-muted">
            Esta rotina é uma sugestão educacional montada por regras, não uma prescrição. Dor, lesão, gestação ou
            condição clínica pedem orientação de um profissional qualificado antes de treinar.
          </p>
        </section>
      ) : null}
    </div>
  );
}
