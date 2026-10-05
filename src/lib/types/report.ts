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
  theme?: string;
  darkMode?: boolean;
  enableHistory?: 'auto' | boolean;
  minimalReport?: boolean;
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
  body?: string | null;
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
  theme?: string;
  darkMode?: boolean;
  enableHistory?: 'auto' | boolean;
  minimalReport?: boolean;
}
