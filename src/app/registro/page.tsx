import type { Metadata } from 'next';
import { LogSurface } from '@/components/log/log-surface';
import { getExercises } from '@/lib/exercises';

export const metadata: Metadata = {
  title: 'Registro | Glowy Move',
  description: 'Log de execução de séries guardado no seu dispositivo: carga, repetições e data de cada série.',
};

export default async function RegistroPage() {
  const exercises = await getExercises();
  return <LogSurface exercises={exercises} />;
}
