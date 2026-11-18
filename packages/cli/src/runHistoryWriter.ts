import * as path from 'path';
import { SqliteHistoryStore } from './history/SqliteHistoryStore';
import { RemoteHistoryStore } from './history/RemoteHistoryStore';
import type { HistoryConfig, ResultSummary, TestCase as TestCaseModel } from '@arpanp/zen-core';

export interface ShardConfig {
  current: number;
  total: number;
}

export interface WriteRunHistoryOptions {
  startTime: string;
  testRunName: string;
  /**
   * Original user-supplied test run name template (e.g. "Unit Tests Run #{N}"),
   * before `{N}` is replaced with the actual run number. Persisted so
   * historical run reconstruction can restore the configured template.
   */
  rawTestRunName?: string;
  projectName: string;
  shard?: ShardConfig | null;
  outputDir: string;
  summary: ResultSummary;
  endedAt: string;
  testCases: TestCaseModel[];
  stepCategories?: Record<string, number>;
  historyConfig?: HistoryConfig;
  maxRuns?: number;
  windowSize?: number;
  configWarnings?: string[];
  systemNotices?: string[];
}

/**
 * Resolves the absolute path of the history database from the history configuration.
 * `dbFilename` is treated as a plain filename inside `outputDir` (any directory
 * components are stripped via `path.basename`); the deprecated `dbPath` is resolved
 * against `cwd`.
 *
 * @param cwd - Current working directory.
 * @param outputDir - Absolute path of the report output directory.
 * @param history - User history configuration, if any.
 * @returns Absolute path of the SQLite history database file.
 */
export function resolveHistoryDbPath(
  cwd: string,
  outputDir: string,
  history?: HistoryConfig
): string {
  if (typeof history === 'object' && history !== null) {
    if ('dbFilename' in history && history.dbFilename) {
      return path.join(outputDir, path.basename(String(history.dbFilename)));
    }
    if ('dbPath' in history && history.dbPath) {
      return path.resolve(cwd, String(history.dbPath));
    }
  }
  return path.join(outputDir, 'history.db');
}

/**
 * Persists test run data to the centralized SQLite database (`history.db`) or remote server.
 * Failure policy: catch-and-log only — history writing must never break report/HTML generation.
 *
 * @param options - Configuration options containing run metrics, metadata, and test cases.
 * @returns Array of system notice strings if any were added during write (e.g. fallback to local).
 */
export async function writeRunHistory(
  options: WriteRunHistoryOptions
): Promise<string[] | undefined> {
  const cwd = process.cwd();
  const normalizedCwd = cwd.endsWith('/') ? cwd.slice(0, -1) : cwd;
  const outputDir = path.resolve(normalizedCwd, options.outputDir);

  try {
    if (
      typeof options.historyConfig === 'object' &&
      options.historyConfig !== null &&
      options.historyConfig.mode === 'remote'
    ) {
      const fallbackToLocal = options.historyConfig.fallbackToLocal !== false;
      let remoteStore: RemoteHistoryStore | undefined;
      try {
        remoteStore = new RemoteHistoryStore({
          ...options.historyConfig,
          outputDir: options.outputDir,
        });
        await remoteStore.saveRun(options);
        return;
      } catch (remoteError) {
        if (!fallbackToLocal) {
          throw remoteError;
        }

        const isTTY =
          typeof process !== 'undefined' && process.stderr && Boolean(process.stderr.isTTY);
        const prefix = isTTY ? '\x1b[33m[Zen Reporter Warning]\x1b[0m' : '[Zen Reporter Warning]';

        console.warn(
          `${prefix} Remote history ingestion failed; falling back to local SQLite store.`,
          remoteError
        );

        const notice =
          'Remote history ingestion server unreachable or rejected upload. Execution history was preserved in local SQLite storage.';
        const systemNotices = options.systemNotices ? [...options.systemNotices, notice] : [notice];

        const dbPath = resolveHistoryDbPath(normalizedCwd, outputDir, options.historyConfig);
        const store = new SqliteHistoryStore({
          dbPath,
          maxRuns: options.maxRuns,
          windowSize: options.windowSize,
        });
        try {
          await store.saveRun({
            ...options,
            systemNotices,
          });
        } finally {
          await store.close();
        }
        return systemNotices;
      } finally {
        if (remoteStore) {
          await remoteStore.close();
        }
      }
    }

    const dbPath = resolveHistoryDbPath(normalizedCwd, outputDir, options.historyConfig);
    const store = new SqliteHistoryStore({
      dbPath,
      maxRuns: options.maxRuns,
      windowSize: options.windowSize,
    });
    try {
      await store.saveRun(options);
    } finally {
      await store.close();
    }
    return options.systemNotices;
  } catch (e) {
    console.warn('History write failed:', e);
    return options.systemNotices;
  }
}
