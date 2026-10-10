'use client';

import { useRef, useState } from 'react';
import { CheckCircle2, CircleAlert, Lightbulb, RotateCcw, Sparkles } from 'lucide-react';
import { ANALYSIS_PROFILE_META } from '@/lib/catalog';
import type { AnalysisResult, Finding } from '@/lib/analysis/types';
import type { Exercise } from '@/lib/types';
import { PoseStage, type PoseStageHandle } from '@/components/analyze/pose-stage';
import { ReferenceExecution } from '@/components/analyze/reference-execution';

interface ResultsPanelProps {
  result: AnalysisResult;
  videoUrl: string | null;
  aspect: number;
  reference: Exercise | undefined;
  onRestart: () => void;
}

function nounFor(result: AnalysisResult, count: number): string {
  const isStride = ANALYSIS_PROFILE_META[result.profile].cycleNoun === 'passada';
  if (isStride) return count === 1 ? 'passada' : 'passadas';
  return count === 1 ? 'repetição' : 'repetições';
}

function severityLabel(severity: Finding['severity']): string {
  return severity === 'atencao' ? 'Atenção' : 'Ajuste fino';
}

function FindingCard({ finding }: { finding: Finding }) {
  const attention = finding.severity === 'atencao';
  return (
    <article className="card p-5">
      <div className="flex flex-wrap items-center gap-2">
        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
            attention ? 'bg-ink text-canvas' : 'border border-line text-muted'
          }`}
        >
          <CircleAlert aria-hidden="true" className="h-3.5 w-3.5" />
          {severityLabel(finding.severity)}
        </span>
        <span className="pill">Confiança {finding.confidence}</span>
        <span className="pill">
          Ciclo {finding.cycleNumber} · {finding.timestamp.toFixed(1).replace('.', ',')} s
        </span>
      </div>

      <h3 className="mt-3 text-base font-semibold text-ink">{finding.title}</h3>
      <p className="mt-1.5 text-sm leading-relaxed text-muted">{finding.detail}</p>

      <div className="mt-4 rounded-lg bg-elevated p-3.5">
        <p className="flex items-center gap-1.5 text-[12px] font-semibold tracking-[0.06em] text-subtle">
          <Lightbulb aria-hidden="true" className="h-3.5 w-3.5" />
          Experimente assim
        </p>
        <p className="mt-1.5 text-sm leading-relaxed text-ink">{finding.cue}</p>
      </div>
    </article>
  );
}

export function ResultsPanel({ result, videoUrl, aspect, reference, onRestart }: ResultsPanelProps) {
  const stageRef = useRef<PoseStageHandle>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const meta = ANALYSIS_PROFILE_META[result.profile];
  const count = result.cycles.length;
  const noun = nounFor(result, count);
  const singular = nounFor(result, 1);
  const Singular = singular.charAt(0).toUpperCase() + singular.slice(1);

  return (
    <section aria-labelledby="resultado-titulo" className="rise">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">ANÁLISE CONCLUÍDA</p>
          <h2 id="resultado-titulo" className="display mt-2 text-[34px] text-ink sm:text-[46px]">
            {count} {noun} {count === 1 ? 'encontrada' : 'encontradas'}
          </h2>
          <p className="mt-2 text-sm text-muted">
            {meta.label} · vista {result.view.toLowerCase()} · {result.validFrames} quadros aproveitados de{' '}
            {result.sampledFrames} amostrados.
          </p>
        </div>

        <div className="flex items-center gap-4">
          <div className="rounded-card border border-line bg-surface px-5 py-3 text-center">
            <p className="eyebrow">CONSISTÊNCIA</p>
            <p className="display mt-1 text-[34px] text-ink">{result.consistency}</p>
          </div>
          <button type="button" onClick={onRestart} className="btn-ghost">
            <RotateCcw aria-hidden="true" className="h-4 w-4" />
            Nova análise
          </button>
        </div>
      </div>

      <div className="mt-6 grid items-start gap-6 lg:grid-cols-[1.15fr_1fr]">
        <div className="lg:sticky lg:top-24">
          <PoseStage
            frames={result.frames}
            cycles={result.cycles}
            durationSec={result.durationSec}
            aspect={aspect}
            videoUrl={videoUrl}
            cycleNoun={meta.cycleNoun}
            handleRef={stageRef}
            onTimeChange={setCurrentTime}
          />

          <div className="mt-4">
            <p className="eyebrow">Linha do tempo por ciclo</p>
            <ul className="mt-2 flex flex-wrap gap-2">
              {result.cycles.map((cycle) => {
                const active = currentTime >= cycle.startSec && currentTime <= cycle.endSec;
                return (
                  <li key={cycle.number} className="min-w-[92px] flex-1">
                    <button
                      type="button"
                      onClick={() => stageRef.current?.seek(cycle.startSec)}
                      aria-pressed={active}
                      aria-label={`Ir para a ${singular} ${cycle.number}, início em ${cycle.startSec
                        .toFixed(1)
                        .replace('.', ',')} segundos`}
                      className={`w-full rounded-lg border px-3 py-2 text-left transition-colors ${
                        active ? 'border-cyan bg-elevated' : 'border-line bg-surface hover:bg-elevated'
                      }`}
                    >
                      <span className="block text-[11px] font-semibold text-muted">
                        {Singular} {cycle.number}
                      </span>
                      <span className="block text-sm font-semibold text-ink">{cycle.score}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>

        <div className="space-y-4">
          {result.consistent ? (
            <article className="card p-5">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-elevated px-2.5 py-1 text-[11px] font-semibold text-subtle">
                <CheckCircle2 aria-hidden="true" className="h-3.5 w-3.5" />
                Sem desvio relevante
              </span>
              <h3 className="mt-3 text-base font-semibold text-ink">Movimento consistente</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted">
                Nas {count} {noun} analisadas, amplitude, alinhamento e ritmo ficaram dentro das faixas de referência
                usadas por este coach.
              </p>
            </article>
          ) : (
            result.findings.map((finding) => <FindingCard key={finding.id} finding={finding} />)
          )}

          <div className="card p-5">
            <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">
              <Sparkles aria-hidden="true" className="h-3.5 w-3.5 text-subtle" />
              {singular} por {singular}
            </p>
            <ul className="mt-3 divide-y divide-line">
              {result.cycles.map((cycle) => (
                <li key={cycle.number} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                  <span className="font-medium text-ink">
                    {Singular} {cycle.number}
                  </span>
                  <span className="text-muted">
                    {cycle.durationSec.toFixed(2).replace('.', ',')} s · {cycle.findings.length}{' '}
                    {cycle.findings.length === 1 ? 'alerta' : 'alertas'}
                  </span>
                  <span className="font-semibold text-ink">{cycle.score}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      <p className="mt-6 rounded-card border border-line bg-surface p-4 text-xs leading-relaxed text-muted">
        Resultado visual, não diagnóstico. Estimativas feitas a partir de vídeo podem errar, principalmente com roupa
        larga, pouca luz ou enquadramento parcial. Dor ou limitação exige avaliação de um profissional qualificado.
      </p>

      {reference ? <ReferenceExecution exercise={reference} /> : null}
    </section>
  );
}
