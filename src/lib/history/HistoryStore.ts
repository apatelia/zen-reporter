import type { HistoryData } from '@arpanp/zen-core';
import type { WriteRunHistoryOptions } from '../runHistoryWriter';

/**
 * Storage adapter interface for recording and querying historical test execution data.
 * Decouples the Playwright reporter and CLI commands from the underlying storage engine
 * (e.g. SQLite, PostgreSQL, or remote HTTP ingestion API).
 */
export interface HistoryStore {
  /**
   * Initializes tables, schema migrations, or network connections.
   */
  init(): Promise<void>;

  /**
   * Persists a completed test run and all of its individual test case executions.
   *
   * @param options - Run metadata, summary metrics, test cases, and step category counts.
   * @returns The unique run ID assigned to this execution.
   */
  saveRun(options: WriteRunHistoryOptions): Promise<string>;

  /**
   * Queries aggregated historical metrics for HTML report embedding or CLI display.
   *
   * @param windowSize - Maximum number of recent runs to include in the trend window.
   * @returns Formatted historical dataset containing runs, flaky tests, regressions, and slowest tests.
   */
  getHistoryData(windowSize?: number): Promise<HistoryData>;

  /**
   * Closes database connections, flushes buffered writes, or releases file locks.
   */
  close(): Promise<void>;
}
