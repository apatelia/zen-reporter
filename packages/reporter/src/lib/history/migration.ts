import { SqliteHistoryStore } from './SqliteHistoryStore';

export interface MigrationOptions {
  /** Directory containing existing .jsonl run files (e.g. `<outputDir>/runs`) */
  runsDir: string;
  /** Destination SQLite database path (e.g. `<outputDir>/history.db`) */
  dbPath: string;
  /** Whether to delete .jsonl files after successful migration. Defaults to false. */
  deleteSourceFiles?: boolean;
}

export interface MigrationResult {
  totalFiles: number;
  migratedRuns: number;
  migratedTestCases: number;
  skippedRuns: number;
  durationMs: number;
}

/**
 * Migrates existing per-run JSONL historical records into the SQLite database.
 * Operates idempotently: skips runs that are already present in the database.
 *
 * @param options - Configuration containing runs directory and SQLite database path.
 * @returns Statistics of the completed migration.
 */
export async function migrateJsonlToSqlite(options: MigrationOptions): Promise<MigrationResult> {
  const store = new SqliteHistoryStore({
    dbPath: options.dbPath,
    autoMigrate: false,
  });
  await store.init();

  try {
    return await store.migrateFromRunsDir(options.runsDir, Boolean(options.deleteSourceFiles));
  } finally {
    await store.close();
  }
}
