import type { Config } from 'tailwindcss';

/**
 * ROTA 1 — Deep Ocean Cyan.
 * Tokens travados do glowy-brand-guidelines para ferramenta digital.
 * Nenhum hex fora desta lista pode entrar na interface.
 */
const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        /** Texto primário. */
        ink: '#E8EEF4',
        /** Texto secundário. */
        muted: '#A8B8C8',
        /** Texto terciário: rótulos, ícones e apoios. */
        subtle: '#7A8FA0',
        /** Fundo da aplicação. */
        canvas: '#0A1628',
        /** Superfície dos cartões. */
        surface: '#0E1D33',
        /** Superfície elevada: campos, chips e blocos internos. */
        elevated: '#13253E',
        /** Bordas e divisores. */
        line: '#1E3450',
        /** Acento único da rota. Pontual: no máximo 2 elementos por tela. */
        cyan: '#00FFFF',
        'cyan-deep': '#00C4C4',
        /** Camada mais profunda, usada atrás de mídia. */
        night: '#060F1D',
      },
      fontFamily: {
        display: ['var(--font-display)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        sans: ['var(--font-body)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        card: '16px',
        lg: '12px',
        xl: '20px',
        '2xl': '24px',
      },
      boxShadow: {
        // Só camadas que flutuam de verdade (modal, aviso) recebem sombra.
        overlay: '0 24px 60px -28px rgba(0, 0, 0, 0.75)',
      },
      letterSpacing: {
        tightest: '-0.03em',
      },
    },
  },
  plugins: [],
};

export default config;
