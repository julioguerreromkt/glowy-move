import { dirname } from 'path';
import { fileURLToPath } from 'url';
import { FlatCompat } from '@eslint/eslintrc';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({ baseDirectory: __dirname });

const config = [
  {
    ignores: ['.next/**', 'node_modules/**', 'out/**', 'public/mediapipe/**', 'data/**', 'next-env.d.ts'],
  },
  ...compat.extends('next/core-web-vitals', 'next/typescript'),
  {
    rules: {
      // As miniaturas do YouTube são buscadas direto pelo navegador, sem passar
      // pelo otimizador do servidor. <img> com width/height/loading é o certo aqui.
      '@next/next/no-img-element': 'off',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    },
  },
];

export default config;
