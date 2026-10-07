import type { ResultSummary, TestCase, TestError, TestSuite } from './types/report';

const FAILED_STATUS_TYPE: Record<TestCase['status'], string | undefined> = {
  passed: undefined,
  skipped: undefined,
  failed: 'Failed',
  timedOut: 'Timed Out',
  interrupted: 'Interrupted',
};

export interface FailedTest {
  title: string;
  suiteTitle: string;
  fileName: string;
  duration: number;
  type: string;
  tags?: string[];
  errors: TestError[];
  testCase: TestCase;
}

/**
 * Helper to recursively traverse a suite and collect failed test cases into results.
 *
 * @param suite - TestSuite tree node.
 * @param parentTitle - Breadcrumb title of parent suite hierarchy.
 * @param results - Accumulator array for failed tests.
 */
function processSuiteForFailures(
  suite: TestSuite,
  parentTitle: string,
  results: FailedTest[]
): void {
  for (const testCase of suite.cases) {
    if (
      testCase.status === 'failed' ||
      testCase.status === 'timedOut' ||
      testCase.status === 'interrupted'
    ) {
      results.push({
        title: testCase.title,
        suiteTitle: parentTitle,
        fileName: testCase.fileName,
        duration: testCase.duration,
        type: FAILED_STATUS_TYPE[testCase.status] ?? 'Failed',
        tags: testCase.tags?.map((tag) => tag.replace('@', '')),
        errors: testCase.errors || [],
        testCase,
      });
    }
  }

  for (const sub of suite.subSuites || []) {
    processSuiteForFailures(sub, `${parentTitle} > ${sub.title}`, results);
  }
}

/**
 * Traverses a test suite hierarchy recursively and extracts all test cases
 * that ended in a failed, timedOut, or interrupted state.
 *
 * @param suites - Array of top-level TestSuite objects.
 * @returns Array of normalized FailedTest structures.
 */
export function extractFailedTests(suites: TestSuite[]): FailedTest[] {
  const results: FailedTest[] = [];

  for (const suite of suites) {
    processSuiteForFailures(suite, suite.title, results);
  }

  return results;
}

/**
 * Builds a nested TestSuite tree for a single spec file based on describePath headers.
 *
 * @param fileName - Relative file name/path of the spec file.
 * @param cases - Test cases belonging to this spec file.
 * @returns Root TestSuite containing nested describe suites and test cases.
 */
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

/**
 * Groups flat test cases by spec file name and builds structured TestSuite trees.
 *
 * @param testCases - Array of flat TestCase models.
 * @returns Array of root TestSuite objects grouped by spec file.
 */
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

/**
 * Recursively flattens a nested suite tree into a single array of test cases.
 *
 * @param suites - Array of TestSuite objects.
 * @returns Flat array of TestCase models.
 */
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
  total: number;
  passed: number;
  failed: number;
  skipped: number;
  executed: number;
  timedOut: number;
  interrupted: number;
  passRate: number;
  flakyCount: number;
  flakyRate: number;
  totalDuration: number;
  avgDuration: number;
  p95Duration: number;
  medianDuration: number;
  minDuration: number;
  maxDuration: number;
  uniqueFiles: number;
  uniqueTagsCount: number;
  speedMultiplier: number;
  cases: TestCase[];
}

export interface ProjectExecutiveKPIs {
  totalProjects: number;
  mostStableProject: { name: string; passRate: number; total: number } | null;
  slowestProject: { name: string; totalDuration: number; avgDuration: number } | null;
  passRateParityDelta: number;
  totalFlakyCount: number;
  overallAvgDuration: number;
}

/**
 * Determines whether a passed test case is flaky (recovered after initial failure).
 *
 * @param tc - TestCase model to evaluate.
 * @returns True if test passed on retry or has recorded failed attempts.
 */
export function isFlakyTest(tc: TestCase): boolean {
  return (
    tc.status === 'passed' &&
    ((tc.attempts !== undefined && tc.attempts > 1) ||
      (tc.failedAttempts !== undefined && tc.failedAttempts.length > 0))
  );
}

/**
 * Computes aggregated execution statistics, pass rates, flakiness, duration percentiles,
 * and relative speed multipliers grouped by Playwright project profile.
 *
 * @param allCases - Flat array of all test cases in the run.
 * @returns Array of ProjectStats objects.
 */
export function computeProjectStats(allCases: TestCase[]): ProjectStats[] {
  const projectCasesMap = new Map<string, TestCase[]>();
  let overallTotalDuration = 0;
  let overallExecutedCount = 0;

  for (const tc of allCases) {
    const proj = tc.project || 'default';
    let cases = projectCasesMap.get(proj);
    if (!cases) {
      cases = [];
      projectCasesMap.set(proj, cases);
    }
    cases.push(tc);

    if (tc.status !== 'skipped') {
      overallTotalDuration += tc.duration || 0;
      overallExecutedCount++;
    }
  }

  const overallAvgDuration =
    overallExecutedCount > 0 ? overallTotalDuration / overallExecutedCount : 0;

  const result: ProjectStats[] = [];

  for (const [name, cases] of projectCasesMap.entries()) {
    let passed = 0;
    let failed = 0;
    let skipped = 0;
    let timedOut = 0;
    let interrupted = 0;
    let flakyCount = 0;
    let totalDuration = 0;

    const fileSet = new Set<string>();
    const tagSet = new Set<string>();
    const durations: number[] = [];

    for (const tc of cases) {
      if (tc.fileName) fileSet.add(tc.fileName);
      for (const tag of tc.tags || []) {
        tagSet.add(tag);
      }

      if (isFlakyTest(tc)) {
        flakyCount++;
      }

      switch (tc.status) {
        case 'passed':
          passed++;
          break;
        case 'failed':
          failed++;
          break;
        case 'skipped':
          skipped++;
          break;
        case 'timedOut':
          timedOut++;
          break;
        case 'interrupted':
          interrupted++;
          break;
      }

      if (tc.status !== 'skipped') {
        const d = tc.duration || 0;
        durations.push(d);
        totalDuration += d;
      }
    }

    const total = cases.length;
    const executed = durations.length;
    const passRate = total > 0 ? Math.round((passed / total) * 100) : 0;
    const flakyRate = executed > 0 ? Math.round((flakyCount / executed) * 100) : 0;
    const avgDuration = executed > 0 ? Math.round(totalDuration / executed) : 0;

    durations.sort((a, b) => a - b);

    let minDuration = 0;
    let maxDuration = 0;
    let medianDuration = 0;
    let p95Duration = 0;

    if (durations.length > 0) {
      minDuration = durations[0];
      maxDuration = durations[durations.length - 1];

      const len = durations.length;
      if (len % 2 === 1) {
        medianDuration = durations[Math.floor(len / 2)];
      } else {
        medianDuration = Math.round((durations[len / 2 - 1] + durations[len / 2]) / 2);
      }

      const p95Idx = Math.min(len - 1, Math.max(0, Math.ceil(0.95 * len) - 1));
      p95Duration = durations[p95Idx];
    }

    const speedMultiplier =
      overallAvgDuration > 0 && avgDuration > 0
        ? Math.round((avgDuration / overallAvgDuration) * 10) / 10
        : 1.0;

    result.push({
      name,
      total,
      passed,
      failed,
      skipped,
      executed,
      timedOut,
      interrupted,
      passRate,
      flakyCount,
      flakyRate,
      totalDuration,
      avgDuration,
      p95Duration,
      medianDuration,
      minDuration,
      maxDuration,
      uniqueFiles: fileSet.size,
      uniqueTagsCount: tagSet.size,
      speedMultiplier,
      cases,
    });
  }

  return result;
}

/**
 * Computes high-level executive KPIs comparing stability, parity delta, and duration across projects.
 *
 * @param projectStats - Aggregated project statistics array.
 * @returns ProjectExecutiveKPIs summary structure.
 */
export function computeProjectExecutiveKPIs(projectStats: ProjectStats[]): ProjectExecutiveKPIs {
  if (projectStats.length === 0) {
    return {
      totalProjects: 0,
      mostStableProject: null,
      slowestProject: null,
      passRateParityDelta: 0,
      totalFlakyCount: 0,
      overallAvgDuration: 0,
    };
  }

  let mostStable = projectStats[0];
  let slowest = projectStats[0];
  let maxPassRate = projectStats[0].passRate;
  let minPassRate = projectStats[0].passRate;
  let totalFlaky = 0;
  let combinedTotalDuration = 0;
  let combinedTotalExecuted = 0;

  for (const proj of projectStats) {
    totalFlaky += proj.flakyCount;
    combinedTotalDuration += proj.totalDuration;
    combinedTotalExecuted += proj.total - proj.skipped;

    if (proj.passRate > maxPassRate) maxPassRate = proj.passRate;
    if (proj.passRate < minPassRate) minPassRate = proj.passRate;

    if (
      proj.passRate > mostStable.passRate ||
      (proj.passRate === mostStable.passRate && proj.flakyRate < mostStable.flakyRate) ||
      (proj.passRate === mostStable.passRate &&
        proj.flakyRate === mostStable.flakyRate &&
        proj.total > mostStable.total)
    ) {
      mostStable = proj;
    }

    if (proj.totalDuration > slowest.totalDuration) {
      slowest = proj;
    }
  }

  const passRateParityDelta = maxPassRate - minPassRate;
  const overallAvgDuration =
    combinedTotalExecuted > 0 ? Math.round(combinedTotalDuration / combinedTotalExecuted) : 0;

  return {
    totalProjects: projectStats.length,
    mostStableProject: {
      name: mostStable.name,
      passRate: mostStable.passRate,
      total: mostStable.total,
    },
    slowestProject: {
      name: slowest.name,
      totalDuration: slowest.totalDuration,
      avgDuration: slowest.avgDuration,
    },
    passRateParityDelta,
    totalFlakyCount: totalFlaky,
    overallAvgDuration,
  };
}

export interface StatusPercentages {
  passed: number;
  failed: number;
  timedOut: number;
  interrupted: number;
  skipped: number;
  failureRate: number;
  passRate: number;
}

export type SummaryCountsInput = Pick<
  ResultSummary,
  'total' | 'passed' | 'failed' | 'timedOut' | 'skipped'
> & { interrupted?: number; duration?: number };

/**
 * Computes status percentages using the Largest Remainder Method (Hare-Niemeyer).
 * Guarantees that individual integer status percentages sum to 100% and that constituent
 * failure status cards (failed + timedOut + interrupted) exactly match the total failureRate.
 *
 * @param summary - Result summary or counts object.
 * @returns StatusPercentages object.
 */
export function computeStatusPercentages(summary: SummaryCountsInput): StatusPercentages {
  const { total, passed, failed, timedOut, skipped } = summary;
  const interrupted = summary.interrupted ?? 0;

  if (total === 0) {
    return {
      passed: 0,
      failed: 0,
      timedOut: 0,
      interrupted: 0,
      skipped: 0,
      failureRate: 0,
      passRate: 0,
    };
  }

  // 0: passed, 1: failed, 2: timedOut, 3: interrupted, 4: skipped
  const counts = [passed, failed, timedOut, interrupted, skipped];
  const floors = [0, 0, 0, 0, 0];
  const remainders = [0, 0, 0, 0, 0];
  let sumFloors = 0;

  for (let i = 0; i < 5; i++) {
    const pct = (counts[i] / total) * 100;
    const floor = Math.floor(pct);
    floors[i] = floor;
    remainders[i] = pct - floor;
    sumFloors += floor;
  }

  const remainderToDistribute = 100 - sumFloors;

  // Order indices 0..4 by remainder descending, with original index as tie-breaker
  const indices = [0, 1, 2, 3, 4];
  indices.sort((a, b) => remainders[b] - remainders[a] || a - b);

  for (let i = 0; i < remainderToDistribute && i < 5; i++) {
    floors[indices[i]] += 1;
  }

  const failureRate = floors[1] + floors[2] + floors[3];

  return {
    passed: floors[0],
    failed: floors[1],
    timedOut: floors[2],
    interrupted: floors[3],
    skipped: floors[4],
    failureRate,
    passRate: floors[0],
  };
}

/**
 * Computes overall pass rate percentage from a ResultSummary or counts object.
 *
 * @param summary - Result summary or counts object.
 * @returns Integer percentage (0 to 100).
 */
export function computePassRate(summary: SummaryCountsInput): number {
  if (summary.total === 0) return 0;
  return computeStatusPercentages(summary).passRate;
}

/**
 * Computes the maximum duration (in ms) among all executed (non-skipped) test cases.
 *
 * @param allCases - Array of test cases.
 * @returns Maximum duration in milliseconds, or 0 if no tests executed.
 */
export function computeSlowestTest(allCases: TestCase[]): number {
  const executedCases = allCases.filter((tc) => tc.status !== 'skipped');
  if (executedCases.length === 0) return 0;
  return Math.max(...executedCases.map((tc) => tc.duration));
}

/**
 * Computes the minimum duration (in ms) among all executed (non-skipped) test cases.
 *
 * @param allCases - Array of test cases.
 * @returns Minimum duration in milliseconds, or 0 if no tests executed.
 */
export function computeFastestTest(allCases: TestCase[]): number {
  const executedCases = allCases.filter((tc) => tc.status !== 'skipped');
  if (executedCases.length === 0) return 0;
  return Math.min(...executedCases.map((tc) => tc.duration));
}

/**
 * Counts unique tags present across all test cases.
 *
 * @param allCases - Array of test cases.
 * @returns Number of unique tags.
 */
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
  interrupted: number;
  totalDuration: number;
  avgDuration: number;
  flakyCount: number;
}

/**
 * Aggregates execution metrics, status counts, durations, and flakiness per spec file.
 *
 * @param allCases - Flat array of test cases.
 * @returns Array of FileStats sorted by total test count descending.
 */
export function computeFileStats(allCases: TestCase[]): FileStats[] {
  const fileMap = new Map<string, FileStats>();

  for (const tc of allCases) {
    const file = tc.fileName || 'unknown file';
    if (!fileMap.has(file)) {
      fileMap.set(file, {
        fileName: file,
        total: 0,
        passed: 0,
        failed: 0,
        skipped: 0,
        timedOut: 0,
        interrupted: 0,
        totalDuration: 0,
        avgDuration: 0,
        flakyCount: 0,
      });
    }
    const stats = fileMap.get(file)!;
    stats.total++;
    if (tc.status !== 'skipped') {
      stats.totalDuration += tc.duration || 0;
    }

    if (isFlakyTest(tc)) {
      stats.flakyCount++;
    }

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
      case 'interrupted':
        stats.interrupted++;
        break;
    }
  }

  for (const stats of fileMap.values()) {
    const executed = stats.total - stats.skipped;
    stats.avgDuration = executed > 0 ? Math.round(stats.totalDuration / executed) : 0;
  }

  return Array.from(fileMap.values()).sort((a, b) => b.total - a.total);
}
