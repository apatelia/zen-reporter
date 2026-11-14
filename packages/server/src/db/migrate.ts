import path from 'node:path';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { db, sql } from './index.js';

/**
 * Applies all pending SQL migrations from src/db/migrations to the database, then closes the connection.
 */
async function runMigrations(): Promise<void> {
  const migrationsFolder = path.join(import.meta.dirname, 'migrations');
  console.log(`[zen-server] Applying migrations from ${migrationsFolder}`);
  await migrate(db, { migrationsFolder });
  console.log('[zen-server] Migrations applied successfully.');
  await sql.end();
}

runMigrations().catch((err) => {
  console.error('[zen-server] Migration failed:', err);
  process.exit(1);
});
