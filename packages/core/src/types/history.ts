// Run-history data (computed by `zr history report`; snake_case fields
// deliberately match the JSONL/SQL column names)

export interface HistoryRun {
  run_id: string;
  run_name: string;
  started_at: string;
  run_duration_ms: number;
  run_sequential_duration_ms?: number | null;
  run_workers?: number;
  run_files?: number;
  run_total: number;
  run_passed: number;
  run_failed: number;
  run_skipped: number;
  run_timed_out: number;
  run_interrupted: number;
  pass_rate: number | null;
  project_durations?: Record<string, number>;
  step_categories?: Record<string, number>;
}

export interface HistoryFlakyRow {
  suite: string;
  file: string;
  title: string;
  project: string;
  failed_runs: number;
  passed_runs: number;
  recovered_by_retry: number;
  total_runs: number;
  last_seen_at?: string;
  last_flaky_at?: string;
}

export interface HistoryRegressionRow {
  regressed_in: string;
  regressed_at: string;
  last_status: string;
  last_run_at: string;
  suite: string;
  file: string;
  title: string;
  project: string;
}

export interface HistorySlowRow {
  suite: string;
  file: string;
  title: string;
  project: string;
  avg_duration_ms?: number;
  max_duration_ms?: number;
  last_duration_ms?: number;
  avg_ms?: number;
  max_ms?: number;
  last_ms?: number;
  runs: number;
}

export interface HistoryFileRow {
  run_id?: string;
  started_at: string;
  file: string;
  total: number;
  passed: number;
  failed: number;
  timed_out: number;
  interrupted: number;
  skipped: number;
}

export interface HistoryTestRow {
  run_id?: string;
  started_at: string;
  suite: string;
  file: string;
  title: string;
  project: string;
  total: number;
  passed: number;
  failed: number;
  timed_out: number;
  interrupted: number;
  skipped: number;
  avg_duration_ms?: number;
}

export interface HistoryData {
  generated_at: string;
  runs: HistoryRun[];
  flaky: HistoryFlakyRow[];
  regressions: HistoryRegressionRow[];
  slowest: HistorySlowRow[];
  project_trends?: { project: string }[];
  files?: HistoryFileRow[];
  tests?: HistoryTestRow[];
}

/** Local SQLite file-based history configuration (zero-config, offline, standalone) */
export interface LocalHistoryConfig {
  mode?: 'local';
  /**
   * Custom path or filename for the SQLite database.
   * Defaults to `${outputDir}/history.db`
   */
  dbPath?: string;
  /**
   * Maximum number of historical runs embedded into the static HTML report.
   * Default: 50
   */
  windowSize?: number;
  /**
   * Retention policy: max number of runs to keep in history.db (or 0 for infinite).
   * Default: 1000
   */
  maxRuns?: number;
}

/** Remote history configuration (team server, LAN dashboard, or cloud SaaS) */
export interface RemoteHistoryConfig {
  mode: 'remote';
  /** URL of the Zen Reporter ingestion server (e.g. 'http://zen.lan:3000' or 'https://api.zen-reporter.io') */
  serverUrl: string;
  /** API key for authenticating with the project/tenant */
  apiKey?: string;
  /** Explicit Project / Repo identifier */
  projectId?: string;
  /**
   * Stable CI execution run key for idempotent de-duplication (e.g. process.env.GITHUB_RUN_ID).
   * If omitted, falls back to automatic detection from CI environment variables.
   */
  runId?: string;
  /**
   * Whether to also save a local SQLite copy as a fallback if the remote server is unreachable.
   * Default: true
   */
  fallbackToLocal?: boolean;
  /**
   * Timeout in milliseconds for HTTP ingestion requests.
   * Default: 5000
   */
  timeoutMs?: number;
}

/** Configuration to disable historical tracking entirely */
export interface DisabledHistoryConfig {
  mode: 'off';
}

/**
 * Historical Data Configuration:
 * - `boolean`: true (local default), false (disabled)
 * - `LocalHistoryConfig`: detailed local settings
 * - `RemoteHistoryConfig`: push to central server or SaaS
 * - `DisabledHistoryConfig`: turn history off
 */
export type HistoryConfig =
  boolean | LocalHistoryConfig | RemoteHistoryConfig | DisabledHistoryConfig;
