import type { Metadata, Viewport } from 'next';
import './globals.css';
import { SiteHeader } from '@/components/site-header';
import { SiteFooter } from '@/components/site-footer';
import { ToastProvider } from '@/components/toast';
import { PwaRegister } from '@/components/pwa-register';

export const metadata: Metadata = {
  title: 'Glowy Move',
  description:
    'Coach de movimento da Glowy Life: análise de exercício processada no seu dispositivo, biblioteca de exercícios e planejador semanal.',
  applicationName: 'Glowy Move',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    title: 'Glowy Move',
    statusBarStyle: 'black-translucent',
  },
  icons: {
    apple: '/icons/icon-180.png',
  },
};

export const viewport: Viewport = {
  themeColor: '#0A1628',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className="min-h-dvh bg-canvas font-sans antialiased">
        <ToastProvider>
          <a
            href="#conteudo"
            className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-cyan focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-canvas"
          >
            Pular para o conteúdo
          </a>
          <SiteHeader />
          <main id="conteudo">{children}</main>
          <SiteFooter />
          <PwaRegister />
        </ToastProvider>
      </body>
    </html>
  );
}
