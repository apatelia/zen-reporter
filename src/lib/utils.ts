import type { TestStep as PwTestStep } from '@playwright/test/reporter';
import type { ResultSummary, TestCase, TestError, TestStep, TestSuite } from './types';

export function convertPlaywrightSteps(pwSteps: PwTestStep[]): TestStep[] {
  return pwSteps.map((step) => {
    const error: TestStep['error'] = step.error
      ? {
          name: 'Error',
          message: step.error.message ?? '',
          stack: step.error.stack || '',
          location: step.error.location
            ? {
                file: step.error.location.file,
                line: step.error.location.line,
                column: step.error.location.column,
              }
            : null,
          snippet: step.error.snippet || '',
          cause: (step.error.cause as any) || null,
        }
      : null;

    const status: TestStep['status'] = step.error ? 'failed' : 'passed';

    return {
      title: step.title,
      duration: step.duration,
      status,
      annotations: (step as any).annotations || [],
      attachments: step.attachments
        ? step.attachments.map((att) => ({
            name: att.name,
            contentType: att.contentType,
            path: att.path || null,
            body: att.body || null,
          }))
        : [],
      error,
      subSteps:
        step.steps && step.steps.length > 0 ? convertPlaywrightSteps(step.steps) : undefined,
    };
  });
}

export function sanitizeAnsi(str: string): string {
  // eslint-disable-next-line no-control-regex
  return str.replace(/\x1b\[[0-9;]*m/g, '');
}

export function parseAnsiToHtml(str: string): string {
  if (!str) return '';

  const ansiColorMap: Record<number, string> = {
    30: 'color: #4b5563', // black
    31: 'color: #ef4444', // red
    32: 'color: #22c55e', // green
    33: 'color: #eab308', // yellow
    34: 'color: #3b82f6', // blue
    35: 'color: #a855f7', // magenta
    36: 'color: #06b6d4', // cyan
    37: 'color: #f3f4f6', // white
    90: 'color: #6b7280', // bright black / gray
    91: 'color: #f87171', // bright red
    92: 'color: #4ade80', // bright green
    93: 'color: #facc15', // bright yellow
    94: 'color: #60a5fa', // bright blue
    95: 'color: #c084fc', // bright magenta
    96: 'color: #22d3ee', // bright cyan
    97: 'color: #ffffff', // bright white
  };

  const styleMap: Record<number, string> = {
    1: 'font-weight: bold',
    2: 'opacity: 0.7',
    3: 'font-style: italic',
    4: 'text-decoration: underline',
  };

  let openSpans = 0;
  // eslint-disable-next-line no-control-regex
  const result = escapeHTML(str).replace(/\x1b\[([0-9;]*)m/g, (_, p1) => {
    if (!p1 || p1 === '0') {
      const closing = '</span>'.repeat(openSpans);
      openSpans = 0;
      return closing;
    }

    const codes = p1.split(';').map(Number);
    const styles: string[] = [];

    for (const code of codes) {
      if (code === 0) {
        // Reset handled below
      } else if (ansiColorMap[code]) {
        styles.push(ansiColorMap[code]);
      } else if (styleMap[code]) {
        styles.push(styleMap[code]);
      }
    }

    if (styles.length > 0) {
      openSpans++;
      return `<span style="${styles.join('; ')}">`;
    }

    return '';
  });

  return result + '</span>'.repeat(openSpans);
}

export function escapeHTML(html: string): string {
  return html
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function extractGroupKey(tc: TestCase): string {
  const parts = tc.title.split(' > ');
  if (parts.length >= 2) {
    return parts.slice(0, 2).join(' > ');
  }
  return tc.fileName;
}

export function buildHierarchyForFile(fileName: string, cases: TestCase[]): TestSuite {
  const rootSuite: TestSuite = {
    title: fileName,
    cases: [],
    subSuites: [],
  };

  for (const tc of cases) {
    const describePath =
      tc.describePath || (tc.parent && tc.parent !== tc.fileName ? [tc.parent] : []);
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

export function buildSuitesFromCases(testCases: TestCase[]): TestSuite[] {
  const fileGroups: Record<string, TestCase[]> = {};

  for (const tc of testCases) {
    const key = tc.fileName || 'unknown file';
    if (!fileGroups[key]) fileGroups[key] = [];
    fileGroups[key].push(tc);
  }

  const suites: TestSuite[] = [];
  for (const [fileName, cases] of Object.entries(fileGroups)) {
    suites.push(buildHierarchyForFile(fileName, cases));
  }

  return suites;
}

export function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (minutes > 0) return `${minutes}m ${secs}s`;
  return `${secs}s`;
}

export function formatDurationVerbose(ms: number): string {
  if (ms >= 1000) return `${(ms / 1000).toFixed(1)}s`;
  return `${ms}ms`;
}

export function formatDate(iso: string): string {
  const d = new Date(iso);
  return (
    d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }) +
    ' · ' +
    d.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      timeZoneName: 'short',
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
  errors: TestError[];
}

export function extractFailedTests(suites: TestSuite[]): FailedTest[] {
  const results: FailedTest[] = [];

  function processSuiteForFailures(suite: TestSuite, parentTitle: string) {
    for (const testCase of suite.cases) {
      if (testCase.status === 'failed' || testCase.status === 'timedOut') {
        results.push({
          title: testCase.title,
          suiteTitle: parentTitle,
          fileName: testCase.fileName,
          duration: Math.round(testCase.duration / 1000),
          type: testCase.status === 'timedOut' ? 'Timed Out' : 'Failed',
          tags: testCase.tags?.map((tag) => tag.replace('@', '')),
          errors: testCase.errors || [],
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

export function collectAllCases(suites: TestSuite[]): TestCase[] {
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

export function computeProjectStats(allCases: TestCase[]): ProjectStats[] {
  const projectMap = new Map<string, ProjectStats>();

  for (const tc of allCases) {
    const project = tc.project;
    if (!projectMap.has(project)) {
      projectMap.set(project, { name: project, passed: 0, failed: 0, skipped: 0, timedOut: 0 });
    }
    const stats = projectMap.get(project)!;
    switch (tc.status) {
      case 'passed':
        stats.passed++;
        break;
      case 'failed':
        stats.failed++;
        break;
      case 'skipped':
        stats.skipped++;
        break;
      case 'timedOut':
        stats.timedOut++;
        break;
    }
  }

  return Array.from(projectMap.values());
}

export function computePassRate(summary: ResultSummary): number {
  if (summary.total === 0) return 0;
  return Math.round((summary.passed / summary.total) * 100);
}

export function computeSlowestTest(allCases: TestCase[]): number {
  if (allCases.length === 0) return 0;
  return Math.max(...allCases.map((tc) => tc.duration));
}

export function getTotalTags(allCases: TestCase[]): number {
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

export function computeFileStats(allCases: TestCase[]): FileStats[] {
  const fileMap = new Map<string, FileStats>();

  for (const tc of allCases) {
    const file = tc.fileName;
    if (!fileMap.has(file)) {
      fileMap.set(file, {
        fileName: file,
        total: 0,
        passed: 0,
        failed: 0,
        skipped: 0,
        timedOut: 0,
      });
    }
    const stats = fileMap.get(file)!;
    stats.total++;
    switch (tc.status) {
      case 'passed':
        stats.passed++;
        break;
      case 'failed':
        stats.failed++;
        break;
      case 'skipped':
        stats.skipped++;
        break;
      case 'timedOut':
        stats.timedOut++;
        break;
    }
  }

  return Array.from(fileMap.values()).sort((a, b) => b.total - a.total);
}

export function truncateFileName(fileName: string, maxLength: number = 40): string {
  if (fileName.length <= maxLength) return fileName;
  const extensionIndex = fileName.lastIndexOf('.');
  const extension = extensionIndex !== -1 ? fileName.slice(extensionIndex) : '';
  const nameWithoutExt = extensionIndex !== -1 ? fileName.slice(0, extensionIndex) : fileName;
  const availableNameLength = maxLength - extension.length;
  if (availableNameLength <= 6) {
    return '...' + fileName.slice(maxLength - 3);
  }
  const halfLen = Math.floor(availableNameLength / 2);
  return nameWithoutExt.slice(0, halfLen) + '...' + nameWithoutExt.slice(-halfLen) + extension;
}
