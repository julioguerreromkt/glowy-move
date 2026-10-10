'use client';

import { ANALYSIS_PROFILE_META, ANALYSIS_PROFILE_ORDER } from '@/lib/catalog';
import type { AnalysisProfile, ShotView } from '@/lib/types';

const DESCRIPTIONS: Record<AnalysisProfile, string> = {
  squat: 'Profundidade, tronco e trajetória dos joelhos.',
  pushup: 'Linha do corpo e amplitude dos cotovelos.',
  curl: 'Posição dos cotovelos e amplitude da flexão.',
  lunge: 'Passadas contínuas, profundidade e estabilidade.',
};

interface ExercisePickerProps {
  value: AnalysisProfile | null;
  onChange: (profile: AnalysisProfile) => void;
  view: ShotView;
  onViewChange: (view: ShotView) => void;
}

export function ExercisePicker({ value, onChange, view, onViewChange }: ExercisePickerProps) {
  const meta = value ? ANALYSIS_PROFILE_META[value] : null;

  return (
    <section aria-labelledby="passo-01" className="mt-14">
      <p className="eyebrow">PASSO 01</p>
      <h2 id="passo-01" className="display mt-2 text-[30px] text-ink sm:text-[38px]">
        O que você vai treinar?
      </h2>

      <ul className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {ANALYSIS_PROFILE_ORDER.map((profile) => {
          const item = ANALYSIS_PROFILE_META[profile];
          const active = value === profile;
          return (
            <li key={profile}>
              <button
                type="button"
                onClick={() => onChange(profile)}
                aria-pressed={active}
                className={`h-full w-full rounded-card border p-5 text-left transition-colors ${
                  active ? 'border-cyan bg-elevated' : 'border-line bg-surface hover:bg-elevated'
                }`}
              >
                <span
                  className={`inline-flex h-9 w-9 items-center justify-center rounded-lg text-[13px] font-bold ${
                    active ? 'bg-ink text-canvas' : 'bg-elevated text-subtle'
                  }`}
                >
                  {item.code}
                </span>
                <span className="mt-3 block text-[17px] font-semibold leading-snug text-ink">{item.label}</span>
                <span className="mt-1 block text-sm leading-relaxed text-muted">{DESCRIPTIONS[profile]}</span>
                <span className="mt-3 block text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">
                  {item.views.length > 1 ? 'Lateral ou frontal' : 'Vista lateral'}
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      {meta && meta.views.length > 1 ? (
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <span className="text-sm text-muted">Ângulo da câmera:</span>
          <div className="inline-flex gap-2" role="group" aria-label="Ângulo da câmera">
            {meta.views.map((option: ShotView) => (
              <button
                key={option}
                type="button"
                onClick={() => onViewChange(option)}
                aria-pressed={view === option}
                className={`rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
                  view === option ? 'chip-on' : 'chip-off'
                }`}
              >
                {option}
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}
