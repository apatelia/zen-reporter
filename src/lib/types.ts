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
  duration: number;
  status: 'passed' | 'failed' | 'skipped' | 'timedOut';
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
  status: 'passed' | 'failed' | 'skipped' | 'timedOut';
  duration: number;
  steps?: TestStep[];
  errors?: TestError[];
  stdout?: string[];
  stderr?: string[];
  annotations?: Annotation[];
  attachments?: Attachment[];
  tags?: string[];
  describePath?: string[];
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
  startTime: string;
  endTime: string;
  duration: number;
  numberOfProjects: number;
}

export interface TestRun {
  summary: ResultSummary;
  suites: TestSuite[];
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
  body: Buffer | null;
}

export interface Location {
  file: string;
  line: number;
  column: number;
}
