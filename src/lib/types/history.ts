// Run-history data (computed by `zr history report`; snake_case fields
// deliberately match the JSONL/SQL column names)

export interface HistoryRun {
  run_id: string;
  run_name: string;
  started_at: string;
  run_duration_ms: number;
  run_sequential_duration_ms?: number | null;
  run_workers?: number;
  run_total: number;
  run_passed: number;
  run_failed: number;
  run_skipped: number;
  run_timed_out: number;
  run_interrupted: number;
  pass_rate: number | null;
  project_durations?: Record<string, number>;
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
  files?: HistoryFileRow[];
  tests?: HistoryTestRow[];
}
