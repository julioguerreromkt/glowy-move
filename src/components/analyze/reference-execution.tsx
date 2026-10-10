import { ExternalLink, TriangleAlert } from 'lucide-react';
import { VideoPlayer } from '@/components/video-player';
import type { Exercise } from '@/lib/types';

export function ReferenceExecution({ exercise }: { exercise: Exercise }) {
  return (
    <section aria-labelledby="referencia-titulo" className="mt-12">
      <p className="eyebrow">EXECUÇÃO DE REFERÊNCIA</p>
      <h2 id="referencia-titulo" className="display mt-2 text-[30px] text-ink sm:text-[38px]">
        Compare com uma execução bem feita.
      </h2>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.1fr_1fr]">
        <VideoPlayer
          videoId={exercise.videoId}
          title={exercise.name}
          source={exercise.videoSource}
          escapeLabel="Abrir no YouTube"
        />

        <div className="card p-5 sm:p-6">
          <h3 className="display text-[24px] text-ink">{exercise.name}</h3>
          <p className="mt-2 text-sm leading-relaxed text-muted">{exercise.description}</p>

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
            Respeite a sua mobilidade e o seu momento. Não treine com dor: nesse caso procure um profissional
            qualificado antes de repetir o movimento.
          </p>

          <a
            href={exercise.videoUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-accent mt-5 w-full sm:w-auto"
          >
            Assistir execução correta
            <ExternalLink aria-hidden="true" className="h-4 w-4" />
          </a>
        </div>
      </div>
    </section>
  );
}
