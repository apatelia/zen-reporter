import type { FullConfig } from '@playwright/test/reporter';
import * as fs from 'fs';
import * as path from 'path';
import { buildRunId, flattenRunRows } from './runHistory';
import type { ResultSummary, TestCase as TestCaseModel } from './types/report';

export interface WriteRunHistoryOptions {
  startTime: string;
  testRunName: string;
  projectName: string;
  shard?: FullConfig['shard'];
  outputDir: string;
  summary: ResultSummary;
  endedAt: string;
  testCases: TestCaseModel[];
}

/**
 * Persist every run as a self-contained per-run JSONL file under
 * `<outputDir>/runs/` so historic runs survive report rebuilds.
 * Failure policy: catch-and-log only — history writing must never break report/HTML generation.
 *
 * @param options - Configuration options containing run metrics, metadata, and test cases.
 */
export function writeRunHistory(options: WriteRunHistoryOptions): void {
  try {
    const runId = buildRunId(options.startTime, options.testRunName, options.shard ?? null);
    const cwd = process.cwd();
    const normalizedCwd = cwd.endsWith('/') ? cwd.slice(0, -1) : cwd;
    const runsDir = path.resolve(normalizedCwd, options.outputDir, 'runs');

    // Collision guard (two invocations same ms + same name): append -2, -3, ...
    let finalRunId = runId;
    let suffix = 2;

    while (fs.existsSync(path.join(runsDir, `${finalRunId}.jsonl`))) {
      finalRunId = `${runId}-${suffix}`;
      suffix += 1;
    }

    const rows = flattenRunRows(
      finalRunId,
      options.testRunName,
      options.projectName,
      options.summary,
      options.endedAt,
      options.testCases
    );

    fs.mkdirSync(runsDir, { recursive: true });
    fs.writeFileSync(
      path.join(runsDir, `${finalRunId}.jsonl`),
      rows.map((r) => JSON.stringify(r)).join('\n') + '\n',
      'utf8'
    );
  } catch (e) {
    console.error('Run history write failed:', e);
  }
}
