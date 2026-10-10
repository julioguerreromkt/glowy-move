import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';

export const exercises = sqliteTable('exercises', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  muscleGroup: text('muscle_group').notNull(),
  /** JSON serializado: string[] */
  secondaryMuscles: text('secondary_muscles').notNull(),
  equipment: text('equipment').notNull(),
  difficulty: text('difficulty').notNull(),
  motion: text('motion').notNull(),
  description: text('description').notNull(),
  /** JSON serializado: [string, string, string] */
  steps: text('steps').notNull(),
  commonMistake: text('common_mistake').notNull(),
  analyzable: integer('analyzable', { mode: 'boolean' }).notNull(),
  analysisProfile: text('analysis_profile'),
  cameraView: text('camera_view').notNull(),
  sortOrder: real('sort_order').notNull(),
  videoId: text('video_id').notNull(),
  videoSource: text('video_source').notNull(),
  videoUrl: text('video_url').notNull(),
});

export type ExerciseRow = typeof exercises.$inferSelect;
export type ExerciseInsert = typeof exercises.$inferInsert;

export const CREATE_TABLE_SQL = `
CREATE TABLE IF NOT EXISTS exercises (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  muscle_group TEXT NOT NULL,
  secondary_muscles TEXT NOT NULL,
  equipment TEXT NOT NULL,
  difficulty TEXT NOT NULL,
  motion TEXT NOT NULL,
  description TEXT NOT NULL,
  steps TEXT NOT NULL,
  common_mistake TEXT NOT NULL,
  analyzable INTEGER NOT NULL,
  analysis_profile TEXT,
  camera_view TEXT NOT NULL,
  sort_order REAL NOT NULL,
  video_id TEXT NOT NULL,
  video_source TEXT NOT NULL,
  video_url TEXT NOT NULL
);
`;
