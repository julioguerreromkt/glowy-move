'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import { TriangleAlert, X } from 'lucide-react';
import { VideoPlayer } from '@/components/video-player';
import type { Exercise } from '@/lib/types';

export function ExerciseModal({ exercise, onClose }: { exercise: Exercise; onClose: () => void }) {
  const closeRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-night/75 p-0 sm:items-center sm:p-6"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-exercicio-titulo"
        className="max-h-[92dvh] w-full max-w-2xl overflow-y-auto rounded-t-2xl border border-line bg-surface shadow-overlay sm:rounded-2xl"
      >
        <div className="flex items-start justify-between gap-4 border-b border-line p-5">
          <div>
            <p className="eyebrow">{exercise.muscleGroup}</p>
            <h2 id="modal-exercicio-titulo" className="display mt-1 text-[26px] text-ink">
              {exercise.name}
            </h2>
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Fechar detalhes do exercício"
            className="rounded-full border border-line p-2 text-muted transition-colors hover:bg-elevated hover:text-ink"
          >
            <X aria-hidden="true" className="h-4 w-4" />
          </button>
        </div>

        <div className="p-5">
          <VideoPlayer videoId={exercise.videoId} title={exercise.name} source={exercise.videoSource} />

          <dl className="mt-5 grid gap-4 sm:grid-cols-2">
            <div>
              <dt className="eyebrow">Músculos</dt>
              <dd className="mt-1 text-sm text-ink">
                {exercise.muscleGroup}
                {exercise.secondaryMuscles.length ? ` · ${exercise.secondaryMuscles.join(', ')}` : ''}
              </dd>
            </div>
            <div>
              <dt className="eyebrow">Equipamento</dt>
              <dd className="mt-1 text-sm text-ink">
                {exercise.equipment} · {exercise.difficulty}
              </dd>
            </div>
          </dl>

          <p className="mt-5 text-sm leading-relaxed text-muted">{exercise.description}</p>

          <ol className="mt-5 space-y-3">
            {exercise.steps.map((step, index) => (
              <li key={step} className="flex gap-3 text-sm text-ink">
                <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-elevated text-[12px] font-semibold text-subtle">
                  {index + 1}
                </span>
                <span className="leading-relaxed">{step}</span>
              </li>
            ))}
          </ol>

          <p className="mt-5 flex gap-2 rounded-lg bg-elevated p-3 text-xs leading-relaxed text-muted">
            <TriangleAlert aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-subtle" />
            Erro comum: {exercise.commonMistake}
          </p>

          {exercise.analyzable ? (
            <div className="mt-5">
              <Link href={`/?exercicio=${exercise.id}`} className="btn-accent">
                Analisar meu vídeo
              </Link>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
