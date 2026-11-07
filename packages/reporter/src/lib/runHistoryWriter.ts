import type { FullConfig } from '@playwright/test/reporter';
import * as path from 'path';
import { SqliteHistoryStore } from './history/SqliteHistoryStore';
import { RemoteHistoryStore } from './history/RemoteHistoryStore';
import type { HistoryConfig, ResultSummary, TestCase as TestCaseModel } from '@arpanp/zen-core';

export interface WriteRunHistoryOptions {
  startTime: string;
  testRunName: string;
  projectName: string;
  shard?: FullConfig['shard'];
  outputDir: string;
  summary: ResultSummary;
  endedAt: string;
  testCases: TestCaseModel[];
  stepCategories?: Record<string, number>;
  historyConfig?: HistoryConfig;
  dbPath?: string;
  maxRuns?: number;
  windowSize?: number;
}

/**
 * Persists test run data to the centralized SQLite database (`history.db`).
 * Failure policy: catch-and-log only — history writing must never break report/HTML generation.
 *
 * @param options - Configuration options containing run metrics, metadata, and test cases.
 */
export async function writeRunHistory(options: WriteRunHistoryOptions): Promise<void> {
  const cwd = process.cwd();
  const normalizedCwd = cwd.endsWith('/') ? cwd.slice(0, -1) : cwd;
  const outputDir = path.resolve(normalizedCwd, options.outputDir);

  try {
    if (
      typeof options.historyConfig === 'object' &&
      options.historyConfig !== null &&
      options.historyConfig.mode === 'remote'
    ) {
      const remoteStore = new RemoteHistoryStore({
        ...options.historyConfig,
        outputDir: options.outputDir,
      });
      await remoteStore.saveRun(options);
      await remoteStore.close();
      return;
    }

    const dbPath = options.dbPath
      ? path.resolve(normalizedCwd, options.dbPath)
      : path.join(outputDir, 'history.db');
    const store = new SqliteHistoryStore({
      dbPath,
      maxRuns: options.maxRuns,
      windowSize: options.windowSize,
    });
    await store.saveRun(options);
    await store.close();
  } catch (e) {
    console.warn('History write failed:', e);
  }
}
