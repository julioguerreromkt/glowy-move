import type { Metadata } from 'next';
import { GuidedSurface } from '@/components/guided/guided-surface';

export const metadata: Metadata = {
  title: 'Treino | Glowy Move',
  description: 'Treino guiado do dia: exercício por exercício, série por série, com carga pré-preenchida, descanso e recorde ao vivo.',
};

export default function TreinoPage() {
  return <GuidedSurface />;
}
