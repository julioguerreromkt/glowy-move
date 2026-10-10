'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Plus, SkipForward, Timer } from 'lucide-react';

function format(seconds: number): string {
  const safe = Math.max(0, seconds);
  const mm = Math.floor(safe / 60);
  const ss = safe % 60;
  return `${mm}:${ss.toString().padStart(2, '0')}`;
}

export function RestTimer({ seconds, onDone }: { seconds: number; onDone: () => void }) {
  const [remaining, setRemaining] = useState(seconds);
  const doneRef = useRef(onDone);
  doneRef.current = onDone;

  useEffect(() => {
    setRemaining(seconds);
  }, [seconds]);

  useEffect(() => {
    const id = window.setInterval(() => {
      setRemaining((prev) => {
        if (prev <= 1) {
          window.clearInterval(id);
          doneRef.current();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [seconds]);

  const add = useCallback(() => setRemaining((prev) => prev + 30), []);

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-card border border-line bg-elevated p-4">
      <span className="flex items-center gap-2 text-ink">
        <Timer aria-hidden="true" className="h-4 w-4 text-cyan" />
        <span className="font-display text-[22px] font-bold tabular-nums" aria-live="polite">
          {format(remaining)}
        </span>
      </span>
      <span className="text-xs text-muted">Descanso entre séries</span>
      <div className="ml-auto flex items-center gap-2">
        <button type="button" onClick={add} className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface px-3 py-1.5 text-xs font-semibold text-ink transition-colors hover:bg-elevated">
          <Plus aria-hidden="true" className="h-3.5 w-3.5" />
          30s
        </button>
        <button type="button" onClick={() => doneRef.current()} className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface px-3 py-1.5 text-xs font-semibold text-ink transition-colors hover:bg-elevated">
          <SkipForward aria-hidden="true" className="h-3.5 w-3.5" />
          Pular
        </button>
      </div>
    </div>
  );
}
