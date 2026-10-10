import { AnalyzeSurface } from '@/components/analyze/analyze-surface';
import { getExercises } from '@/lib/exercises';

export default async function AnalyzePage() {
  const exercises = await getExercises();
  return <AnalyzeSurface exercises={exercises} />;
}
