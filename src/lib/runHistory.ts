import type { ResultSummary, TestCase } from './types/report';

/**
 * Exact ordered field list for a single history row (single source of truth
 * for the JSONL row shape that DuckDB's read_json consumes).
 */
export const RUN_ROW_FIELDS: string[] = [
  'run_id',
  'run_name',
  'project_name',
  'started_at',
  'ended_at',
  'run_duration_ms',
  'run_sequential_duration_ms',
  'run_total',
  'run_passed',
  'run_failed',
  'run_skipped',
  'run_timed_out',
  'run_interrupted',
  'run_workers',
  'run_projects',
  'step_assertions',
  'step_actions',
  'step_network',
  'step_hooks',
  'step_waits',
  'step_others',
  'file',
  'suite',
  'title',
  'project',
  'status',
  'duration_ms',
  'attempts',
  'failed_attempts',
  'passed_on_retry',
  'error_message',
  'error_stack',
  'error_file',
  'error_line',
  'tags',
];

/**
 * Converts a string into a URL/file-safe slug.
 * Lowercases, trims, replaces non-alphanumeric sequences with a hyphen, and strips leading/trailing hyphens.
 *
 * @param name - The input string to slugify.
 * @returns The slugified string.
 */
export function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Generates a deterministic run identifier based on start timestamp, test run name, and optional shard configuration.
 *
 * @param startedAtIso - The ISO formatted start timestamp of the test run.
 * @param testRunName - The name of the test run.
 * @param shard - Optional shard metadata containing current shard index and total shard count.
 * @returns The formatted run identifier.
 */
export function buildRunId(
  startedAtIso: string,
  testRunName: string,
  shard: { current: number; total: number } | null
): string {
  const base = `${startedAtIso.replace(/[:.]/g, '-')}__${slugify(testRunName)}`;

  if (shard && shard.total > 1) {
    return `${base}__shard${shard.current}of${shard.total}`;
  }

  return base;
}

/**
 * Flattens test run metadata and individual test cases into single-row records for historical indexing.
 * Ensures uniform JSON schema formatting for DuckDB queries.
 *
 * @param runId - Unique identifier of the run.
 * @param testRunName - Name of the test run.
 * @param projectName - Name of the project.
 * @param summary - Execution result summary statistics.
 * @param endedAt - ISO formatted end timestamp of the test run.
 * @param testCases - List of test case result models.
 * @returns Array of record objects conforming to `RUN_ROW_FIELDS`.
 */
export function flattenRunRows(
  runId: string,
  testRunName: string,
  projectName: string,
  summary: ResultSummary,
  endedAt: string,
  testCases: TestCase[],
  stepCategories?: Record<string, number>
): Record<string, unknown>[] {
  const runLevel: Record<string, unknown> = {
    run_id: runId,
    run_name: testRunName,
    project_name: projectName,
    started_at: summary.startTime,
    ended_at: endedAt,
    run_duration_ms: summary.duration,
    run_sequential_duration_ms: summary.totalSequentialDuration ?? null,
    run_total: summary.total,
    run_passed: summary.passed,
    run_failed: summary.failed,
    run_skipped: summary.skipped,
    run_timed_out: summary.timedOut,
    run_interrupted: summary.interrupted ?? 0,
    run_workers: summary.workers ?? null,
    run_projects: summary.numberOfProjects,
    step_assertions: stepCategories?.assertions ?? 0,
    step_actions: stepCategories?.actions ?? 0,
    step_network: stepCategories?.network ?? 0,
    step_hooks: stepCategories?.hooks ?? 0,
    step_waits: stepCategories?.waits ?? 0,
    step_others: stepCategories?.others ?? 0,
  };

  if (testCases.length === 0) {
    // Ensure every schema column exists even when there are no test rows, so
    // DuckDB's read_json still sees a uniform schema.
    const row: Record<string, unknown> = {};

    for (const field of RUN_ROW_FIELDS) {
      row[field] = (runLevel as Record<string, unknown>)[field] ?? null;
    }

    return [row];
  }

  return testCases.map((tc) => {
    const row: Record<string, unknown> = { ...runLevel };

    row.file = tc.fileName;
    row.suite = (tc.describePath?.length ? tc.describePath.join(' > ') : tc.parent) || '';
    row.title = tc.title;
    row.project = tc.project;
    row.status = tc.status;
    row.duration_ms = Math.round(tc.duration);
    row.attempts = tc.attempts ?? 0;
    row.failed_attempts = tc.failedAttempts?.length ?? 0;
    row.passed_on_retry = (tc.attempts ?? 0) > 1 && tc.status === 'passed';
    row.error_message = tc.errors?.[0]?.message ?? null;
    row.error_stack = tc.errors?.[0]?.stack ?? null;
    row.error_file = tc.errors?.[0]?.location?.file ?? null;
    row.error_line = tc.errors?.[0]?.location?.line ?? null;
    row.tags = tc.tags ?? [];

    return row;
  });
}
