/* Popula data/glowy-move.db com o catálogo embutido. Rode: npm run db:seed */
import fs from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';
import { EXERCISE_CATALOG } from '../src/lib/catalog';
import { CREATE_TABLE_SQL } from './schema';

const file = process.env.GLOWY_MOVE_DB_PATH ?? path.join(process.cwd(), 'data', 'glowy-move.db');
fs.mkdirSync(path.dirname(file), { recursive: true });

const db = new Database(file);
db.exec(CREATE_TABLE_SQL);
db.exec('DELETE FROM exercises;');

const insert = db.prepare(`
INSERT INTO exercises (
  id, name, muscle_group, secondary_muscles, equipment, difficulty, motion,
  description, steps, common_mistake, analyzable, analysis_profile, camera_view,
  sort_order, video_id, video_source, video_url
) VALUES (
  @id, @name, @muscleGroup, @secondaryMuscles, @equipment, @difficulty, @motion,
  @description, @steps, @commonMistake, @analyzable, @analysisProfile, @cameraView,
  @sortOrder, @videoId, @videoSource, @videoUrl
)`);

const tx = db.transaction(() => {
  for (const ex of EXERCISE_CATALOG) {
    insert.run({
      id: ex.id,
      name: ex.name,
      muscleGroup: ex.muscleGroup,
      secondaryMuscles: JSON.stringify(ex.secondaryMuscles),
      equipment: ex.equipment,
      difficulty: ex.difficulty,
      motion: ex.motion,
      description: ex.description,
      steps: JSON.stringify(ex.steps),
      commonMistake: ex.commonMistake,
      analyzable: ex.analyzable ? 1 : 0,
      analysisProfile: ex.analysisProfile,
      cameraView: ex.cameraView,
      sortOrder: ex.sortOrder,
      videoId: ex.videoId,
      videoSource: ex.videoSource,
      videoUrl: ex.videoUrl,
    });
  }
});

tx();
const count = (db.prepare('SELECT COUNT(*) AS n FROM exercises').get() as { n: number }).n;
db.close();
console.log(`[seed] ${count} exercícios gravados em ${file}`);
