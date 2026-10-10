'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Info, X } from 'lucide-react';

interface ToastState {
  id: number;
  title: string;
  description?: string;
}

interface ToastApi {
  notify: (title: string, description?: string) => void;
}

const ToastContext = createContext<ToastApi>({ notify: () => {} });

export function useToast(): ToastApi {
  return useContext(ToastContext);
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ToastState | null>(null);

  const notify = useCallback((title: string, description?: string) => {
    setToast({ id: Date.now(), title, description });
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 6000);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const api = useMemo(() => ({ notify }), [notify]);

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div
        aria-live="polite"
        aria-atomic="true"
        className="pointer-events-none fixed inset-x-3 bottom-4 z-50 flex justify-center sm:inset-x-0"
      >
        {toast ? (
          <div className="pointer-events-auto rise flex w-full max-w-md items-start gap-3 rounded-card border border-line bg-elevated px-4 py-3 text-ink shadow-overlay">
            <Info aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-cyan" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold">{toast.title}</p>
              {toast.description ? <p className="mt-0.5 text-xs text-muted">{toast.description}</p> : null}
            </div>
            <button
              type="button"
              onClick={() => setToast(null)}
              aria-label="Fechar aviso"
              className="rounded-full p-1 text-muted transition-colors hover:bg-white/10 hover:text-ink"
            >
              <X aria-hidden="true" className="h-4 w-4" />
            </button>
          </div>
        ) : null}
      </div>
    </ToastContext.Provider>
  );
}
