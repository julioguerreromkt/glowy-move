import 'server-only';
import fs from 'node:fs';
import path from 'node:path';
import { drizzle, type BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import * as schema from './schema';

export type GlowyMoveDatabase = BetterSQLite3Database<typeof schema>;

let cached: GlowyMoveDatabase | null | undefined;

export function databaseFile(): string {
  return process.env.GLOWY_MOVE_DB_PATH ?? path.join(process.cwd(), 'data', 'glowy-move.db');
}

/**
 * Abre o banco SQLite se ele existir. Retorna null em qualquer cenário de
 * indisponibilidade (arquivo ausente, runtime sem binário nativo, permissão),
 * porque o catálogo embutido é o fallback obrigatório do produto.
 */
export function getDatabase(): GlowyMoveDatabase | null {
  if (cached !== undefined) return cached;
  try {
    const file = databaseFile();
    if (!fs.existsSync(file)) {
      cached = null;
      return cached;
    }
    // Import dinâmico via require: mantém o binário nativo fora do bundle do edge.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Database = require('better-sqlite3') as typeof import('better-sqlite3');
    const sqlite = new Database(file, { readonly: true, fileMustExist: true });
    cached = drizzle(sqlite, { schema });
    return cached;
  } catch {
    cached = null;
    return cached;
  }
}

export function resetDatabaseCache(): void {
  cached = undefined;
}
