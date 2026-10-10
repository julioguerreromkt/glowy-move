'use client';

import { useState } from 'react';
import { ExternalLink, Play } from 'lucide-react';
import { youtubeThumbnail, youtubeWatchUrl } from '@/lib/catalog';

interface VideoPlayerProps {
  videoId: string;
  /** Nome do exercício, usado nos rótulos de acessibilidade. */
  title: string;
  source: string;
  /** Texto do link de escape. A microcopy muda conforme o contexto. */
  escapeLabel?: string;
}

/**
 * Player com carregamento sob demanda.
 *
 * Enquanto a pessoa não clica, a página mostra apenas a miniatura estática e
 * nenhuma requisição sai para o YouTube: a promessa de privacidade da home
 * continua verdadeira em quem só está navegando. O player entra no clique, pelo
 * domínio sem cookie. O link de escape existe porque alguns canais bloqueiam a
 * incorporação, e nesse caso o vídeo precisa ter para onde ir.
 */
export function VideoPlayer({ videoId, title, source, escapeLabel = 'Assistir no YouTube' }: VideoPlayerProps) {
  const [ativo, setAtivo] = useState(false);

  return (
    <div>
      <div className="relative aspect-video overflow-hidden rounded-card border border-line bg-night">
        {ativo ? (
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&rel=0&modestbranding=1`}
            title={`Vídeo de execução do exercício ${title}`}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
            allowFullScreen
            className="absolute inset-0 h-full w-full border-0"
          />
        ) : (
          <button
            type="button"
            onClick={() => setAtivo(true)}
            aria-label={`Reproduzir o vídeo de execução do exercício ${title}`}
            className="group absolute inset-0 block"
          >
            <img
              data-thumb=""
              src={youtubeThumbnail(videoId)}
              alt={`Miniatura do vídeo de execução do exercício ${title}`}
              width={480}
              height={360}
              loading="lazy"
              className="h-full w-full object-cover opacity-85 transition-opacity group-hover:opacity-100"
            />
            <span aria-hidden="true" className="absolute inset-0 flex items-center justify-center">
              <span className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-cyan text-canvas transition-transform duration-150 group-hover:scale-105">
                <Play className="h-6 w-6 translate-x-0.5" fill="currentColor" />
              </span>
            </span>
          </button>
        )}
      </div>

      <div className="mt-2.5 flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
        <p className="text-xs text-muted">Fonte do vídeo: {source}</p>
        <a
          href={youtubeWatchUrl(videoId)}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-cyan hover:underline"
        >
          {escapeLabel}
          <ExternalLink aria-hidden="true" className="h-3 w-3" />
        </a>
      </div>
    </div>
  );
}
