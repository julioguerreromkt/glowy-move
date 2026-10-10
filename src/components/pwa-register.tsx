'use client';

import { useEffect } from 'react';

/**
 * Registra o service worker em produção. Em desenvolvimento fica de fora para
 * não servir arquivos em cache durante o trabalho. Qualquer falha é silenciosa:
 * o app funciona sem o worker, só perde o modo offline.
 */
export function PwaRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') return;
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;

    const register = () => {
      navigator.serviceWorker.register('/sw.js').catch(() => undefined);
    };

    if (document.readyState === 'complete') {
      register();
      return;
    }
    window.addEventListener('load', register);
    return () => window.removeEventListener('load', register);
  }, []);

  return null;
}
