import type { Metadata } from 'next';
import { PlannerSurface } from '@/components/planner/planner-surface';
import { getExercises } from '@/lib/exercises';

export const metadata: Metadata = {
  title: 'Rotina | Glowy Move',
  description: 'Planejador semanal montado por regras determinísticas, direto no seu dispositivo.',
};

export default async function PlannerPage() {
  const exercises = await getExercises();
  return <PlannerSurface exercises={exercises} />;
}
