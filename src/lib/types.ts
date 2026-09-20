export interface TestError {
  name: string;
  message: string;
  stack: string;
  location: Location | null;
  snippet: string;
  cause: TestError | null;
}

export interface TestStep {
  title: string;
  subtitle?: string;
  location?: Location | null;
  snippet?: string;
  params?: Record<string, unknown>;
  duration: number;
  status: 'passed' | 'failed' | 'skipped' | 'timedOut' | 'interrupted';
  annotations: Annotation[];
  attachments: Attachment[];
  error: TestError | null;
  subSteps?: TestStep[];
}

export interface TestCase {
  title: string;
  parent: string;
  project: string;
  fileName: string;
  status: 'passed' | 'failed' | 'skipped' | 'timedOut' | 'interrupted';
  duration: number;
  steps?: TestStep[];
  errors?: TestError[];
  stdout?: string[];
  stderr?: string[];
  annotations?: Annotation[];
  attachments?: Attachment[];
  tags?: string[];
  describePath?: string[];
  attempts?: number;
  failedAttempts?: FailedAttempt[];
}

export interface TestSuite {
  title: string;
  cases: TestCase[];
  subSuites?: TestSuite[];
}

export interface ResultSummary {
  total: number;
  passed: number;
  failed: number;
  skipped: number;
  timedOut: number;
  interrupted?: number;
  startTime: string;
  endTime: string;
  duration: number;
  totalSequentialDuration?: number;
  numberOfProjects: number;
  workers?: number;
}

export interface TestRun {
  summary: ResultSummary;
  suites: TestSuite[];
  projectName?: string;
  testRunName?: string;
}

export interface ReportData {
  testRun: TestRun;
}
export interface Annotation {
  type: string;
  description: string | null;
  location: Location | null;
}

export interface Attachment {
  name: string;
  contentType: string;
  path: string | null;
  body: string | null;
}

export interface Location {
  file: string;
  line: number;
  column: number;
}

export interface FailedAttempt {
  status: 'failed' | 'timedOut' | 'interrupted';
  duration: number;
  error: TestError | null;
  /** Full execution details of this attempt, so it can be rendered like the final attempt. */
  steps?: TestStep[];
  stdout?: string[];
  stderr?: string[];
  attachments?: Attachment[];
}

export interface ReporterConfig {
  outputDir?: string;
  packageManager?: string;
  projectName?: string;
  testRunName?: string;
  singleSummaryFile?: boolean;
}

// ── Run-history data (computed by `zr history report`; snake_case fields
// deliberately match the JSONL/SQL column names) ──────────────────────────

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
  avg_ms: number;
  max_ms: number;
  runs: number;
}

export interface HistoryData {
  generated_at: string;
  runs: HistoryRun[];
  flaky: HistoryFlakyRow[];
  regressions: HistoryRegressionRow[];
  slowest: HistorySlowRow[];
}
