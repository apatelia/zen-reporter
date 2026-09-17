import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';
import type { ReportData, ResultSummary, TestCase, TestRun, TestStep } from './types';
import { buildSuitesFromCases, sanitizeAnsi } from './utils';

export function detectPackageManager(cwd: string = process.cwd()): string {
  const lockfiles: [string, string][] = [
    ['pnpm-lock.yaml', 'pnpm'],
    ['yarn.lock', 'yarn'],
    ['bun.lock', 'bun'],
    ['package-lock.json', 'npm'],
  ];

  for (const [file, manager] of lockfiles) {
    if (existsSync(resolve(cwd, file))) return manager;
  }

  if (existsSync(resolve(cwd, '.npmrc'))) return 'npm';

  try {
    const pkgPath = resolve(cwd, 'package.json');
    if (existsSync(pkgPath)) {
      const pkgJson = JSON.parse(readFileSync(pkgPath, 'utf8'));
      if (pkgJson.packageManager) return pkgJson.packageManager.split('@')[0];
    }
  } catch {
    // Ignore any error and return "npm" as the package manager.
  }

  return 'npm';
}

export function getViteBuildCommand(pm?: string, cwd: string = process.cwd()): string {
  const manager = pm || detectPackageManager(cwd);
  switch (manager) {
    case 'pnpm':
      return 'pnpm exec vite build';
    case 'yarn':
      return 'yarn exec vite build';
    case 'bun':
      return 'bunx vite build';
    default:
      return 'npx vite build';
  }
}

import { getStepCodeSnippet } from './utils';

interface RawTestStep {
  title: string;
  subtitle?: string;
  location?: { file?: string; line?: number; column?: number } | null;
  snippet?: string;
  params?: Record<string, unknown>;
  duration: number;
  error?: { message?: string; stack?: string };
  steps?: RawTestStep[];
}

function isRawTestStep(s: unknown): s is RawTestStep {
  return typeof s === 'object' && s !== null && 'title' in s && 'duration' in s;
}

function convertSteps(steps: RawTestStep[]): TestStep[] {
  return steps.filter(isRawTestStep).map((step) => {
    const location = step.location
      ? {
          file: step.location.file || '',
          line: step.location.line || 0,
          column: step.location.column || 0,
        }
      : null;

    const snippet = step.snippet || getStepCodeSnippet(location, { existsSync, readFileSync });

    return {
      title: step.title,
      subtitle: step.subtitle || undefined,
      location,
      snippet,
      params: step.params || undefined,
      duration: step.duration,
      status: step.error ? 'failed' : step.duration > 0 ? 'passed' : 'skipped',
      annotations: [],
      attachments: [],
      error: step.error
        ? {
            name: 'Error',
            message: step.error.message || '',
            stack: step.error.stack || '',
            location: null,
            snippet: '',
            cause: null,
          }
        : null,
      subSteps: step.steps && step.steps.length > 0 ? convertSteps(step.steps) : undefined,
    };
  });
}

interface RawError {
  name?: string;
  message?: string;
  stack?: string;
}

interface RawTestCase {
  title?: string;
  parent?: { title?: string };
  project?: { name?: string };
  location?: { file?: string };
  status?: string;
  duration?: number;
  steps?: RawTestStep[];
  errors?: RawError[];
  tags?: string[];
}

interface RawPlaywrightData {
  tests?: RawTestCase[];
}

export function processRawData(rawData: RawPlaywrightData): ReportData {
  const startTime = new Date().toISOString();

  const testCases: TestCase[] = [];

  const tests = rawData.tests || [];
  for (const test of tests) {
    const fileName = test.location?.file
      ? test.location.file.replace(process.cwd(), '')
      : 'unknown file';

    const status =
      test.status === 'passed'
        ? ('passed' as const)
        : test.status === 'failed'
          ? ('failed' as const)
          : test.status === 'skipped'
            ? ('skipped' as const)
            : test.status === 'timedOut'
              ? ('timedOut' as const)
              : test.status === 'interrupted'
                ? ('interrupted' as const)
                : ('failed' as const);

    const steps = test.steps ? convertSteps(test.steps) : [];
    const stepDurationSum = steps.reduce((sum, s) => sum + (s.duration || 0), 0);
    const duration = stepDurationSum > 0 ? stepDurationSum : test.duration || 0;

    const testCase: TestCase = {
      title: test.title || '',
      parent: test.parent?.title || '',
      project: test.project?.name || 'unknown',
      fileName,
      status,
      duration,
      steps,
      errors: test.errors
        ? test.errors.map((e: RawError) => ({
            name: e.name || 'Error',
            message: sanitizeAnsi(e.message || ''),
            stack: sanitizeAnsi(e.stack || ''),
            location: null,
            snippet: '',
            cause: null,
          }))
        : [],
      describePath:
        ((test as unknown as Record<string, unknown>).describePath as string[] | undefined) || [],
    };
    testCases.push(testCase);
  }

  const endTime = new Date().toISOString();
  const startTimeMs = new Date(startTime).getTime();
  const endTimeMs = new Date(endTime).getTime();
  const wallClockDuration = Math.max(0, endTimeMs - startTimeMs);

  const passed = testCases.filter((tc) => tc.status === 'passed').length;
  const failed = testCases.filter((tc) => tc.status === 'failed').length;
  const skipped = testCases.filter((tc) => tc.status === 'skipped').length;
  const timedOut = testCases.filter((tc) => tc.status === 'timedOut').length;
  const interrupted = testCases.filter((tc) => tc.status === 'interrupted').length;

  const projects = new Set(testCases.map((tc) => tc.project));

  const summary: ResultSummary = {
    total: testCases.length,
    passed,
    failed,
    skipped,
    timedOut,
    interrupted,
    startTime,
    endTime,
    duration: wallClockDuration,
    numberOfProjects: projects.size || 1,
  };

  const suites = buildSuitesFromCases(testCases);

  const testRun: TestRun = { summary, suites };

  return { testRun };
}
