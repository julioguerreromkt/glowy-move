'use client';

import { useRef, useState } from 'react';
import { CircleAlert, Clapperboard, PlayCircle, ShieldCheck, Upload } from 'lucide-react';
import { ANALYSIS_PROFILE_META } from '@/lib/catalog';
import { ACCEPTED_VIDEO_TYPES, formatBytes, formatSeconds } from '@/lib/analysis/video';
import type { AnalysisProfile, ShotView } from '@/lib/types';

export interface SelectedVideo {
  name: string;
  size: number;
  durationSec: number;
  url: string;
  width: number;
  height: number;
}

interface UploaderProps {
  profile: AnalysisProfile;
  view: ShotView;
  selected: SelectedVideo | null;
  error: { message: string; hint?: string } | null;
  onSelectFile: (file: File) => void;
  onDemo: () => void;
  onAnalyze: () => void;
  onClear: () => void;
}

export function Uploader({
  profile,
  view,
  selected,
  error,
  onSelectFile,
  onDemo,
  onAnalyze,
  onClear,
}: UploaderProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [dragging, setDragging] = useState(false);
  const meta = ANALYSIS_PROFILE_META[profile];
  const isLunge = profile === 'lunge';

  return (
    <section aria-labelledby="passo-02" className="mt-12">
      <p className="eyebrow">PASSO 02</p>
      <h2 id="passo-02" className="display mt-2 text-[30px] text-ink sm:text-[38px]">
        Envie o vídeo do seu movimento.
      </h2>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.15fr_1fr]">
        <div>
          {selected ? (
            <div className="card overflow-hidden">
              <video
                src={selected.url}
                className="aspect-video w-full bg-night object-contain"
                controls
                muted
                playsInline
                preload="metadata"
                aria-label={`Prévia local do vídeo ${selected.name}`}
              />
              <div className="grid gap-3 p-5 sm:grid-cols-2">
                <div>
                  <p className="eyebrow">Arquivo</p>
                  <p className="mt-1 truncate text-sm font-medium text-ink" title={selected.name}>
                    {selected.name}
                  </p>
                  <p className="text-xs text-muted">
                    {formatSeconds(selected.durationSec)} · {formatBytes(selected.size)}
                  </p>
                </div>
                <div>
                  <p className="eyebrow">Exercício e ângulo</p>
                  <p className="mt-1 text-sm font-medium text-ink">{meta.label}</p>
                  <p className="text-xs text-muted">Vista {view.toLowerCase()}</p>
                </div>
                <p className="col-span-full flex items-center gap-2 rounded-lg bg-elevated px-3 py-2 text-xs text-muted">
                  <ShieldCheck aria-hidden="true" className="h-4 w-4 shrink-0 text-subtle" />
                  O vídeo fica no seu dispositivo. Nada é enviado para servidor e nada é guardado depois.
                </p>
                <div className="col-span-full flex flex-wrap gap-3">
                  <button type="button" onClick={onAnalyze} className="btn-accent">
                    <PlayCircle aria-hidden="true" className="h-4 w-4" />
                    Analisar meu movimento
                  </button>
                  <button type="button" onClick={onClear} className="btn-ghost">
                    Trocar vídeo
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div
              onDragOver={(event) => {
                event.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={(event) => {
                event.preventDefault();
                setDragging(false);
                const file = event.dataTransfer.files?.[0];
                if (file) onSelectFile(file);
              }}
              className={`flex flex-col items-center justify-center rounded-card border-2 border-dashed p-10 text-center transition-colors ${
                dragging ? 'border-cyan bg-elevated' : 'border-line bg-surface'
              }`}
            >
              <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-elevated">
                <Upload aria-hidden="true" className="h-5 w-5 text-subtle" />
              </span>
              <p className="mt-4 text-base font-semibold text-ink">Arraste o vídeo aqui</p>
              <p className="mt-1 max-w-sm text-sm text-muted">
                MP4, MOV ou WebM, até 250 MB e 45 segundos. O arquivo é lido direto no navegador.
              </p>
              <div className="mt-5 flex flex-wrap justify-center gap-3">
                <button type="button" onClick={() => inputRef.current?.click()} className="btn-primary">
                  Escolher vídeo
                </button>
                <button type="button" onClick={onDemo} className="btn-ghost">
                  <Clapperboard aria-hidden="true" className="h-4 w-4" />
                  Ver uma análise de demonstração
                </button>
              </div>
              <input
                ref={inputRef}
                type="file"
                accept={ACCEPTED_VIDEO_TYPES.join(',')}
                className="sr-only"
                aria-label="Escolher arquivo de vídeo para analisar"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) onSelectFile(file);
                  event.target.value = '';
                }}
              />
            </div>
          )}

          {error ? (
            <div role="alert" className="mt-4 flex gap-3 rounded-card border border-line bg-surface p-4">
              <CircleAlert aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-subtle" />
              <div>
                <p className="text-sm font-semibold text-ink">{error.message}</p>
                {error.hint ? <p className="mt-1 text-sm leading-relaxed text-muted">{error.hint}</p> : null}
              </div>
            </div>
          ) : null}
        </div>

        <aside className="card p-5 sm:p-6">
          <p className="eyebrow">Guia de gravação</p>
          <ul className="mt-3 space-y-3 text-sm leading-relaxed text-ink">
            <li className="flex gap-2.5">
              <span aria-hidden="true" className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-cyan" />
              Corpo inteiro visível, dos pés à cabeça, sem cortar articulações.
            </li>
            <li className="flex gap-2.5">
              <span aria-hidden="true" className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-cyan" />
              Câmera parada, apoiada, no ângulo escolhido ({view.toLowerCase()}).
            </li>
            <li className="flex gap-2.5">
              <span aria-hidden="true" className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-cyan" />
              {isLunge
                ? 'De 2 a 6 passadas em sequência. Não precisa voltar ao mesmo lugar nem parar entre elas.'
                : 'De 3 a 8 repetições, começando e terminando em posição neutra.'}
            </li>
            <li className="flex gap-2.5">
              <span aria-hidden="true" className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-cyan" />
              Roupa que deixe ver joelhos e cotovelos ajuda bastante a leitura.
            </li>
          </ul>

          <p className="mt-5 rounded-lg bg-elevated p-3 text-xs leading-relaxed text-muted">
            A análise usa apenas a posição das articulações. Não há reconhecimento facial e o vídeo não é armazenado.
          </p>
        </aside>
      </div>
    </section>
  );
}
