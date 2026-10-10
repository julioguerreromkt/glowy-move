'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ShieldCheck, FolderClock } from 'lucide-react';
import { BrandMark } from '@/components/brand-mark';
import { useToast } from '@/components/toast';

export const RESET_ANALYSIS_EVENT = 'form:reset-analysis';

const NAV = [
  { href: '/exercicios', label: 'Exercícios' },
  { href: '/rotina', label: 'Rotina' },
  { href: '/', label: 'Analisar vídeo' },
];

export function SiteHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const { notify } = useToast();

  const goHome = (event: React.MouseEvent<HTMLAnchorElement>) => {
    if (pathname === '/') {
      event.preventDefault();
      window.dispatchEvent(new CustomEvent(RESET_ANALYSIS_EVENT));
      window.scrollTo({ top: 0 });
      return;
    }
    event.preventDefault();
    router.push('/');
  };

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-canvas/80 backdrop-blur-md">
      <div className="mx-auto flex min-h-16 w-full max-w-[1180px] flex-wrap items-center gap-x-4 gap-y-2 px-4 py-2.5 sm:px-6">
        <Link
          href="/"
          onClick={goHome}
          className="flex items-center gap-2 rounded-lg"
          aria-label="Glowy Move, voltar ao início da análise"
        >
          <BrandMark className="h-8 w-8" />
          <span className="display text-[19px] tracking-tightest">
            <span className="font-bold text-cyan">Glowy</span>{' '}
            <span className="font-light text-ink">Move</span>
          </span>
        </Link>

        <nav aria-label="Navegação principal" className="order-3 w-full sm:order-none sm:ml-2 sm:w-auto">
          <ul className="flex items-center gap-1 overflow-x-auto">
            {NAV.map((item) => {
              const active = pathname === item.href;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={active ? 'page' : undefined}
                    className={`inline-flex whitespace-nowrap rounded-full px-3.5 py-2 text-sm font-medium transition-colors ${
                      active ? 'chip-on' : 'text-muted hover:bg-elevated hover:text-ink'
                    }`}
                  >
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <span className="pill hidden md:inline-flex">
            <ShieldCheck aria-hidden="true" className="h-3.5 w-3.5 text-subtle" />
            Análise visual responsável
          </span>
          <button
            type="button"
            onClick={() =>
              notify(
                'Minhas análises chega com a conta',
                'Por enquanto nada é guardado fora do seu dispositivo. Nenhum vídeo ou resultado sai daqui.',
              )
            }
            className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-3.5 py-2 text-sm font-medium text-ink transition-colors hover:bg-elevated"
          >
            <FolderClock aria-hidden="true" className="h-4 w-4 text-subtle" />
            <span className="hidden sm:inline">Minhas análises</span>
            <span className="sr-only sm:hidden">Minhas análises</span>
          </button>
        </div>
      </div>
    </header>
  );
}
