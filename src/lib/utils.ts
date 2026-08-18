import type { TestStep as PwTestStep } from "@playwright/test/reporter";
import type { ResultSummary, TestCase, TestStep, TestSuite } from "./types";

export function convertPlaywrightSteps (pwSteps: PwTestStep[]): TestStep[] {
  return pwSteps.map((step) => {
    const errors: TestStep[ "errors" ] = step.error
      ? [ { name: "Error", message: step.error.message ?? "", stack: step.error.stack || "" } ]
      : [];

    const status: TestStep[ "status" ] = step.error
      ? "failed"
      : step.steps?.length === 0
        ? "passed"
        : "passed";

    return {
      title: step.title,
      duration: step.duration,
      status,
      errors,
      subSteps: step.steps && step.steps.length > 0 ? convertPlaywrightSteps(step.steps) : undefined,
    };
  });
}

export function sanitizeAnsi (str: string): string {
  return str.replace(/\x1b\[[0-9;]*m/g, '');
}

export function escapeHTML (html: string): string {
  return html
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function extractGroupKey (tc: TestCase): string {
  const parts = tc.title.split(" > ");
  if (parts.length >= 2) {
    return parts.slice(0, 2).join(" > ");
  }
  return tc.fileName;
}

export function buildHierarchyForFile (
  fileName: string,
  cases: TestCase[]
): TestSuite {
  const rootSuite: TestSuite = {
    title: fileName,
    cases: [],
    subSuites: [],
  };

  for (const tc of cases) {
    const describePath = tc.describePath || (tc.parent && tc.parent !== tc.fileName ? [ tc.parent ] : []);
    let currentSuite = rootSuite;

    for (const title of describePath) {
      if (!currentSuite.subSuites) {
        currentSuite.subSuites = [];
      }
      let child = currentSuite.subSuites.find((s) => s.title === title);
      if (!child) {
        child = { title, cases: [], subSuites: [] };
        currentSuite.subSuites.push(child);
      }
      currentSuite = child;
    }

    currentSuite.cases.push(tc);
  }

  return rootSuite;
}

export function buildSuitesFromCases (testCases: TestCase[]): TestSuite[] {
  const fileGroups: Record<string, TestCase[]> = {};

  for (const tc of testCases) {
    const key = tc.fileName || "unknown file";
    if (!fileGroups[ key ]) fileGroups[ key ] = [];
    fileGroups[ key ].push(tc);
  }

  const suites: TestSuite[] = [];
  for (const [ fileName, cases ] of Object.entries(fileGroups)) {
    suites.push(buildHierarchyForFile(fileName, cases));
  }

  return suites;
}

export function formatDuration (ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (minutes > 0) return `${minutes}m ${secs}s`;
  return `${secs}s`;
}

export function formatDurationVerbose (ms: number): string {
  if (ms >= 1000) return `${(ms / 1000).toFixed(1)}s`;
  return `${ms}ms`;
}

export function formatDate (iso: string): string {
  const d = new Date(iso);
  return (
    d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }) +
    " · " +
    d.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      timeZoneName: "short",
    })
  );
}

export interface FailedTest {
  title: string;
  suiteTitle: string;
  fileName: string;
  duration: number;
  type: string;
  tags?: string[];
  errors: { name: string; message: string; stack?: string; }[];
}

export function extractFailedTests (suites: TestSuite[]): FailedTest[] {
  const results: FailedTest[] = [];

  function processSuiteForFailures (
    suite: TestSuite,
    parentTitle: string,
  ) {
    for (const testCase of suite.cases) {
      if (testCase.status === "failed" || testCase.status === "timedOut") {
        results.push({
          title: testCase.title,
          suiteTitle: parentTitle,
          fileName: testCase.fileName,
          duration: Math.round(testCase.duration / 1000),
          type: testCase.status === "timedOut" ? "Timed Out" : "Failed",
          tags: testCase.tags?.map((tag) => tag.replace("@", "")),
          errors: (testCase.errors || []).map((err) => ({
            name: err.name,
            message: err.message,
            stack: err.stack,
          })),
        });
      }
    }

    for (const sub of suite.subSuites || []) {
      processSuiteForFailures(sub, `${parentTitle} > ${sub.title}`);
    }
  }

  for (const suite of suites) {
    processSuiteForFailures(suite, suite.title);
  }

  return results;
}

export function collectAllCases (suites: TestSuite[]): TestCase[] {
  const cases: TestCase[] = [];
  for (const suite of suites) {
    cases.push(...suite.cases);
    if (suite.subSuites && suite.subSuites.length > 0) {
      cases.push(...collectAllCases(suite.subSuites));
    }
  }
  return cases;
}

export interface ProjectStats {
  name: string;
  passed: number;
  failed: number;
  skipped: number;
  timedOut: number;
}

export function computeProjectStats (allCases: TestCase[]): ProjectStats[] {
  const projectMap = new Map<string, ProjectStats>();

  for (const tc of allCases) {
    const project = tc.project;
    if (!projectMap.has(project)) {
      projectMap.set(project, { name: project, passed: 0, failed: 0, skipped: 0, timedOut: 0 });
    }
    const stats = projectMap.get(project)!;
    switch (tc.status) {
      case "passed": stats.passed++; break;
      case "failed": stats.failed++; break;
      case "skipped": stats.skipped++; break;
      case "timedOut": stats.timedOut++; break;
    }
  }

  return Array.from(projectMap.values());
}

export function computePassRate (summary: ResultSummary): number {
  if (summary.total === 0) return 0;
  return Math.round((summary.passed / summary.total) * 100);
}

export function computeSlowestTest (allCases: TestCase[]): number {
  if (allCases.length === 0) return 0;
  return Math.max(...allCases.map(tc => tc.duration));
}

export function getTotalTags (allCases: TestCase[]): number {
  const tagSet = new Set<string>();
  for (const tc of allCases) {
    for (const tag of tc.tags || []) {
      tagSet.add(tag);
    }
  }
  return tagSet.size;
}

export interface FileStats {
  fileName: string;
  total: number;
  passed: number;
  failed: number;
  skipped: number;
  timedOut: number;
}

export function computeFileStats (allCases: TestCase[]): FileStats[] {
  const fileMap = new Map<string, FileStats>();

  for (const tc of allCases) {
    const file = tc.fileName;
    if (!fileMap.has(file)) {
      fileMap.set(file, { fileName: file, total: 0, passed: 0, failed: 0, skipped: 0, timedOut: 0 });
    }
    const stats = fileMap.get(file)!;
    stats.total++;
    switch (tc.status) {
      case "passed": stats.passed++; break;
      case "failed": stats.failed++; break;
      case "skipped": stats.skipped++; break;
      case "timedOut": stats.timedOut++; break;
    }
  }

  return Array.from(fileMap.values()).sort((a, b) => b.total - a.total);
}

export function truncateFileName (fileName: string, maxLength: number = 40): string {
  if (fileName.length <= maxLength) return fileName;
  const extensionIndex = fileName.lastIndexOf(".");
  const extension = extensionIndex !== -1 ? fileName.slice(extensionIndex) : "";
  const nameWithoutExt = extensionIndex !== -1 ? fileName.slice(0, extensionIndex) : fileName;
  const availableNameLength = maxLength - extension.length;
  if (availableNameLength <= 6) {
    return "..." + fileName.slice(maxLength - 3);
  }
  const halfLen = Math.floor(availableNameLength / 2);
  return nameWithoutExt.slice(0, halfLen) + "..." + nameWithoutExt.slice(-halfLen) + extension;
}
