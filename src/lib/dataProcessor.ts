import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';
import { getStepCodeSnippet, sanitizeAnsi } from './codeHighlighting';
import { buildSuitesFromCases } from './statsUtils';
import type {
  ReportData,
  ResultSummary,
  TestCase,
  TestError,
  TestRun,
  TestStep,
} from './types/report';

/**
 * Detects the package manager used in the target directory based on lockfiles or package.json settings.
 *
 * @param cwd - Current working directory to inspect.
 * @returns Name of the detected package manager ('pnpm', 'yarn', 'bun', or 'npm').
 */
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

/**
 * Returns the terminal command string for running Vite build using the detected package manager.
 *
 * @param pm - Optional package manager override.
 * @param cwd - Working directory.
 * @returns Command string (e.g. `pnpm exec vite build`).
 */
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

/**
 * Type guard verifying if an unknown value satisfies the `RawTestStep` object structure.
 *
 * @param s - Value to inspect.
 * @returns True if `s` is a valid RawTestStep.
 */
function isRawTestStep(s: unknown): s is RawTestStep {
  return typeof s === 'object' && s !== null && 'title' in s && 'duration' in s;
}

/**
 * Recursively transforms raw test steps into internal `TestStep` models.
 *
 * @param steps - Array of raw test steps.
 * @returns Processed TestStep models.
 */
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

/**
 * Normalizes a single Playwright raw error into the internal TestError shape.
 * Centralizes the shape so callers build errors identically.
 *
 * @param e - Raw error object.
 * @returns Structured TestError instance.
 */
function makeTestError(e: RawError): TestError {
  return {
    name: e.name || 'Error',
    message: sanitizeAnsi(e.message || ''),
    stack: sanitizeAnsi(e.stack || ''),
    location: null,
    snippet: '',
    cause: null,
  };
}

/**
 * Converts a raw test case object into an internal `TestCase` model.
 *
 * @param test - Raw test case input.
 * @param cwd - Base working directory to strip from file paths.
 * @returns Formatted TestCase object.
 */
function convertRawTestCase(test: RawTestCase, cwd: string): TestCase {
  const statusLookup: Record<string, TestCase['status']> = {
    passed: 'passed',
    failed: 'failed',
    skipped: 'skipped',
    timedOut: 'timedOut',
    interrupted: 'interrupted',
  };

  const fileName = test.location?.file ? test.location.file.replace(cwd, '') : 'unknown file';

  const status = statusLookup[test.status || ''] ?? 'failed';
  const steps = test.steps ? convertSteps(test.steps) : [];
  const stepDurationSum = steps.reduce((sum, s) => sum + (s.duration || 0), 0);
  const duration =
    typeof test.duration === 'number' && test.duration > 0 ? test.duration : stepDurationSum;

  return {
    title: test.title || '',
    parent: test.parent?.title || '',
    project: test.project?.name || 'unknown',
    fileName,
    status,
    duration,
    steps,
    errors: (test.errors ?? []).map(makeTestError),
    describePath: (test as unknown as Record<string, unknown>).describePath as string[] | undefined,
  };
}

/**
 * Processes raw Playwright result data into a structured `ReportData` object containing run summaries and suites.
 *
 * @param rawData - Raw Playwright execution payload.
 * @returns Formatted ReportData structure.
 */
export function processRawData(rawData: RawPlaywrightData): ReportData {
  const startTime = new Date().toISOString();
  const cwd = process.cwd();

  const testCases = (rawData.tests || []).map((test) => convertRawTestCase(test, cwd));

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
  const totalSequentialDuration = testCases.reduce((sum, tc) => sum + (tc.duration || 0), 0);

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
    totalSequentialDuration,
    numberOfProjects: projects.size || 1,
  };

  const suites = buildSuitesFromCases(testCases);

  const testRun: TestRun = { summary, suites };

  return { testRun };
}
