import type { ResultSummary, TestCase } from './types';

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
  'run_interrupted',
  'run_passed',
  'run_failed',
  'run_skipped',
  'run_timed_out',
  'run_interrupted',
  'run_workers',
  'run_projects',
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

/** Lowercase, trim, every non-alphanumeric run -> single '-', strip edge '-'. */
export function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Deterministic run identifier: ISO start time (colons/dots -> '-') + slugified
 * test run name, plus a shard suffix when running sharded.
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
 * One row per test case, each carrying the run-level fields plus the per-test
 * fields, so DuckDB can group/join across runs on the uniform schema.
 */
export function flattenRunRows(
  runId: string,
  testRunName: string,
  projectName: string,
  summary: ResultSummary,
  endedAt: string,
  testCases: TestCase[]
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
  };

  if (testCases.length === 0) {
    const row: Record<string, unknown> = { ...runLevel };

    for (const field of RUN_ROW_FIELDS) {
      if (!(field in row)) row[field] = null;
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
