import type { Metadata } from 'next';
import { LibrarySurface } from '@/components/library/library-surface';
import { getExerciseSource } from '@/lib/exercises';

export const metadata: Metadata = {
  title: 'Exercícios | Glowy Move',
  description: 'Biblioteca de exercícios com vídeos reais, instruções e o erro mais comum de cada movimento.',
};

export default async function LibraryPage() {
  const { exercises, origin } = await getExerciseSource();
  return <LibrarySurface exercises={exercises} origin={origin} />;
}
