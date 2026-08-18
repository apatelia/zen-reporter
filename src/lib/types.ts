export interface TestError {
  name: string;
  message: string;
  stack: string;
}

export interface TestStep {
  title: string;
  duration: number;
  status: "passed" | "failed" | "skipped" | "timedOut";
  errors?: TestError[];
  subSteps?: TestStep[];
}

export interface TestCase {
  title: string;
  parent: string;
  project: string;
  fileName: string;
  status: "passed" | "failed" | "skipped" | "timedOut";
  duration: number;
  steps?: TestStep[];
  errors?: TestError[];
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
