import path from 'node:path';
import * as fs from 'node:fs';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { db, sql } from './index.js';

/**
 * Resolves the migrations folder at runtime, supporting both tsx (src/) and compiled (dist/) execution.
 *
 * @returns Absolute path to the migrations directory.
 */
function resolveMigrationsFolder(): string {
  const candidates = [
    path.join(import.meta.dirname, 'migrations'), // tsx: src/db/migrate.ts
    path.join(import.meta.dirname, '..', '..', 'src', 'db', 'migrations'), // compiled: dist/src/db/migrate.js
  ];
  for (const dir of candidates) {
    if (fs.existsSync(dir)) {
      return dir;
    }
  }
  throw new Error(`Migrations folder not found. Tried: ${candidates.join(', ')}`);
}

/**
 * Applies all pending SQL migrations from src/db/migrations to the database, then closes the connection.
 */
async function runMigrations(): Promise<void> {
  const migrationsFolder = resolveMigrationsFolder();
  console.log(`[zen-server] Applying migrations from ${migrationsFolder}`);
  await migrate(db, { migrationsFolder });
  console.log('[zen-server] Migrations applied successfully.');
  await sql.end();
}

runMigrations().catch((err) => {
  console.error('[zen-server] Migration failed:', err);
  process.exit(1);
});
