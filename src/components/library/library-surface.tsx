'use client';

import { useMemo, useState } from 'react';
import { Search, Video } from 'lucide-react';
import { MUSCLE_GROUPS } from '@/lib/types';
import type { Exercise, MuscleGroup } from '@/lib/types';
import { youtubeThumbnail } from '@/lib/catalog';
import { ExerciseModal } from '@/components/library/exercise-modal';

function normalize(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function matches(exercise: Exercise, query: string): boolean {
  if (!query.trim()) return true;
  const q = normalize(query);
  const haystack = [
    exercise.name,
    exercise.muscleGroup,
    exercise.equipment,
    ...exercise.secondaryMuscles,
  ].map(normalize);
  return haystack.some((value) => value.includes(q));
}

export function LibrarySurface({
  exercises,
  origin = 'catálogo embutido',
}: {
  exercises: Exercise[];
  origin?: 'banco' | 'catálogo embutido';
}) {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<MuscleGroup | 'Todos'>('Todos');
  const [openId, setOpenId] = useState<string | null>(null);

  const analyzableCount = exercises.filter((ex) => ex.analyzable).length;
  const groupCount = new Set(exercises.map((ex) => ex.muscleGroup)).size;

  const visible = useMemo(
    () => exercises.filter((ex) => (filter === 'Todos' || ex.muscleGroup === filter) && matches(ex, query)),
    [exercises, filter, query],
  );

  const grouped = useMemo(
    () =>
      MUSCLE_GROUPS.map((group) => ({
        group,
        items: visible.filter((ex) => ex.muscleGroup === group).sort((a, b) => a.sortOrder - b.sortOrder),
      })).filter((section) => section.items.length > 0),
    [visible],
  );

  const open = exercises.find((ex) => ex.id === openId) ?? null;

  return (
    <div data-fonte={origin} className="mx-auto w-full max-w-[1180px] px-4 pb-16 pt-10 sm:px-6 sm:pt-14">
      <section>
        <p className="eyebrow">BIBLIOTECA DE EXERCÍCIOS</p>
        <span aria-hidden="true" className="mt-3 block h-px w-14 bg-line" />
        <h1 className="display mt-5 max-w-3xl text-[40px] text-ink sm:text-[58px]">
          Aprenda primeiro. <span className="text-cyan">Treine melhor.</span>
        </h1>
        <p className="mt-5 max-w-2xl text-base leading-relaxed text-muted sm:text-lg">
          Vídeos reais de execução, instruções passo a passo e o erro mais comum de cada movimento, organizados por
          músculo para você achar rápido o que precisa treinar.
        </p>

        <dl className="mt-8 grid gap-3 sm:grid-cols-3">
          {[
            { label: 'Exercícios', value: exercises.length },
            { label: 'Grupos musculares', value: groupCount },
            { label: 'Com análise por vídeo', value: analyzableCount },
          ].map((item) => (
            <div key={item.label} className="card p-5">
              <dt className="eyebrow">{item.label}</dt>
              <dd className="display mt-1 text-[34px] text-ink">{item.value}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section aria-label="Busca e filtros" className="mt-10">
        <label htmlFor="busca-exercicio" className="eyebrow">
          Buscar exercício
        </label>
        <div className="relative mt-2">
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
          />
          <input
            id="busca-exercicio"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Nome, músculo ou equipamento"
            className="field pl-10"
          />
        </div>

        <ul className="mt-4 flex gap-2 overflow-x-auto pb-1">
          {(['Todos', ...MUSCLE_GROUPS] as Array<MuscleGroup | 'Todos'>).map((group) => {
            const active = filter === group;
            return (
              <li key={group}>
                <button
                  type="button"
                  onClick={() => setFilter(group)}
                  aria-pressed={active}
                  className={`whitespace-nowrap rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
                    active ? 'chip-on' : 'chip-off'
                  }`}
                >
                  {group}
                </button>
              </li>
            );
          })}
        </ul>
      </section>

      {grouped.length === 0 ? (
        <p className="mt-12 card p-8 text-center text-sm text-muted">
          Nenhum exercício encontrado para essa busca. Tente outro nome, outro músculo ou limpe o filtro.
        </p>
      ) : (
        grouped.map((section) => (
          <section key={section.group} aria-labelledby={`grupo-${normalize(section.group).replace(/\s+/g, '-')}`} className="mt-12">
            <div className="flex items-baseline justify-between gap-4">
              <h2
                id={`grupo-${normalize(section.group).replace(/\s+/g, '-')}`}
                className="display text-[26px] text-ink sm:text-[32px]"
              >
                {section.group}
              </h2>
              <span className="text-sm text-muted">
                {section.items.length} {section.items.length === 1 ? 'exercício' : 'exercícios'}
              </span>
            </div>

            <ul className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {section.items.map((exercise) => (
                <li key={exercise.id}>
                  <button
                    type="button"
                    onClick={() => setOpenId(exercise.id)}
                    className="card h-full w-full overflow-hidden text-left transition-shadow hover:shadow-overlay"
                    aria-label={`Ver detalhes de ${exercise.name}`}
                  >
                    <span className="relative block bg-night">
                      <img
                        src={youtubeThumbnail(exercise.videoId)}
              data-thumb=""
                        alt={`Miniatura do vídeo do exercício ${exercise.name}`}
                        width={480}
                        height={360}
                        loading="lazy"
                        className="aspect-video w-full object-cover"
                      />
                      {exercise.analyzable ? (
                        <span className="absolute left-2.5 top-2.5 inline-flex items-center gap-1 rounded-full bg-ink px-2.5 py-1 text-[11px] font-semibold text-canvas">
                          <Video aria-hidden="true" className="h-3 w-3" />
                          Analisa vídeo
                        </span>
                      ) : null}
                    </span>
                    <span className="block p-4">
                      <span className="block text-[15px] font-semibold leading-snug text-ink">{exercise.name}</span>
                      <span className="mt-1 block text-xs text-muted">
                        {exercise.equipment} · {exercise.difficulty}
                      </span>
                      <span className="mt-2 block text-[11px] uppercase tracking-[0.12em] text-muted">
                        Fonte: {exercise.videoSource}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        ))
      )}

      {open ? <ExerciseModal exercise={open} onClose={() => setOpenId(null)} /> : null}
    </div>
  );
}
