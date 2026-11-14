import * as readline from 'readline';

export type ProgressMode = 'line' | 'dot' | 'none';

/**
 * Returns the terminal display width of a single Unicode code point.
 *
 * @param cp - Unicode code point to measure.
 * @returns 0 for zero-width marks, 1 for ASCII, 2 for wide symbols and emoji.
 */
function charDisplayWidth(cp: number): number {
  if ((cp >= 0xfe00 && cp <= 0xfe0f) || (cp >= 0x0300 && cp <= 0x036f)) {
    return 0;
  }
  return cp < 0x80 ? 1 : 2;
}

/**
 * Computes the terminal display width of a string, counting wide symbols and
 * emoji as two columns and zero-width marks as none.
 *
 * @param s - String to measure.
 * @returns Display width in terminal columns.
 */
function displayWidth(s: string): number {
  let width = 0;
  for (const ch of s) {
    width += charDisplayWidth(ch.codePointAt(0) ?? 0);
  }
  return width;
}

/**
 * Truncates a string so its display width fits within a column budget,
 * reserving three columns for an appended ellipsis.
 *
 * @param s - String to truncate.
 * @param maxDisplay - Maximum allowed display width in terminal columns.
 * @returns The truncated string with ellipsis, or the original string if it fits.
 */
function truncateToDisplayWidth(s: string, maxDisplay: number): string {
  if (displayWidth(s) <= maxDisplay) return s;

  const keep = Math.max(10, maxDisplay - 3);
  let cut = '';
  let width = 0;
  for (const ch of s) {
    const cw = charDisplayWidth(ch.codePointAt(0) ?? 0);
    if (width + cw > keep) break;
    cut += ch;
    width += cw;
  }
  return cut + '...';
}

/**
 * Encapsulates TTY console progress rendering ('line' mode for interactive terminals,
 * 'dot' mode for CI/non-TTY environments, or 'none').
 */
export class ProgressPrinter {
  private totalTests = 0;
  private completedTests = 0;
  private completedTestIds = new Set<string>();
  private passedCount = 0;
  private flakyCount = 0;
  private failedCount = 0;
  private timedOutCount = 0;
  private skippedCount = 0;
  private activeWorkers = new Set<string>();
  private lastCompletedTest = '';
  private dotLineLength = 0;
  private progressMode: ProgressMode = 'none';

  /**
   * Initializes the progress printer for a new test run.
   *
   * @param totalTests - Total number of tests scheduled in the run.
   * @param progressMode - Progress rendering mode ('line', 'dot', or 'none').
   */
  init(totalTests: number, progressMode: ProgressMode): void {
    this.reset();
    this.totalTests = totalTests;
    this.progressMode = progressMode;
  }

  /**
   * Resets all internal test counters, worker sets, and TTY line state.
   */
  reset(): void {
    this.totalTests = 0;
    this.completedTests = 0;
    this.completedTestIds.clear();
    this.passedCount = 0;
    this.flakyCount = 0;
    this.failedCount = 0;
    this.timedOutCount = 0;
    this.skippedCount = 0;
    this.activeWorkers.clear();
    this.lastCompletedTest = '';
    this.dotLineLength = 0;
    this.progressMode = 'none';
  }

  /**
   * Registers a worker thread starting execution of a test case.
   *
   * @param testId - Unique Playwright test identifier.
   */
  onWorkerStart(testId: string): void {
    this.activeWorkers.add(testId);

    if (this.progressMode === 'line') {
      this.printLineProgress();
    }
  }

  /**
   * Updates test completion statistics and triggers progress line/dot rendering.
   *
   * @param testId - Unique Playwright test identifier.
   * @param status - Final execution status of the test attempt.
   * @param testLabel - Optional short test label for TTY progress line display.
   */
  onTestComplete(
    testId: string,
    status: 'passed' | 'failed' | 'timedOut' | 'skipped' | 'interrupted' | 'flaky',
    testLabel?: string
  ): void {
    this.activeWorkers.delete(testId);

    if (!this.completedTestIds.has(testId)) {
      this.completedTestIds.add(testId);
      this.completedTests += 1;

      switch (status) {
        case 'passed':
          this.passedCount += 1;
          break;
        case 'flaky':
          this.flakyCount += 1;
          break;
        case 'failed':
          this.failedCount += 1;
          break;
        case 'timedOut':
          this.timedOutCount += 1;
          break;
        case 'skipped':
          this.skippedCount += 1;
          break;
        case 'interrupted':
          this.failedCount += 1;
          break;
      }
    }

    if (testLabel) {
      this.lastCompletedTest = testLabel;
    }

    if (this.progressMode === 'line') {
      this.printLineProgress();
    } else if (this.progressMode === 'dot') {
      this.handleDotProgress(status);
    }
  }

  /**
   * Renders or overwrites the single-line TTY progress line in stdout.
   */
  printLineProgress(): void {
    if (this.progressMode !== 'line') return;

    const isTTY = typeof process !== 'undefined' && process.stdout && Boolean(process.stdout.isTTY);
    if (!isTTY) return;

    const pct = this.totalTests > 0 ? Math.floor((this.completedTests / this.totalTests) * 100) : 0;
    const workersCount = this.activeWorkers.size;
    const workerStr = `${workersCount} active worker${workersCount === 1 ? '' : 's'}`;

    const flakySegment = this.flakyCount > 0 ? ` | 🔄 ${this.flakyCount}` : '';
    let line = `[ ${this.completedTests}/${this.totalTests} ] ${pct}% | ✅ ${this.passedCount}${flakySegment} | ❌ ${this.failedCount + this.timedOutCount} | ⏭️  ${this.skippedCount} (${workerStr})`;

    if (this.lastCompletedTest) {
      line += ` | Last: ${this.lastCompletedTest}`;
    }

    const cols = process.stdout.columns || 100;
    line = truncateToDisplayWidth(line, cols - 1);

    readline.clearLine(process.stdout, 0);
    readline.cursorTo(process.stdout, 0);
    process.stdout.write(line);
  }

  /**
   * Clears the current TTY progress line from stdout to prevent log overlap.
   */
  clearLineProgress(): void {
    if (
      this.progressMode === 'line' &&
      typeof process !== 'undefined' &&
      process.stdout &&
      Boolean(process.stdout.isTTY)
    ) {
      readline.clearLine(process.stdout, 0);
      readline.cursorTo(process.stdout, 0);
    }
  }

  /**
   * Appends dot progress symbols ('.', 'F', '±', 's') for non-TTY or CI environments.
   *
   * @param status - Test execution status.
   */
  handleDotProgress(
    status: 'passed' | 'failed' | 'timedOut' | 'skipped' | 'interrupted' | 'flaky'
  ): void {
    if (this.progressMode !== 'dot') return;

    const isFail = status === 'failed' || status === 'timedOut' || status === 'interrupted';
    const isSkip = status === 'skipped';
    const isFlaky = status === 'flaky';
    const symbol = isFail ? 'F' : isSkip ? 's' : isFlaky ? '±' : '.';

    process.stdout.write(symbol);
    this.dotLineLength += 1;

    if (this.dotLineLength >= 80 || this.completedTestIds.size === this.totalTests) {
      process.stdout.write(` [ ${this.completedTestIds.size}/${this.totalTests} ]\n`);
      this.dotLineLength = 0;
    }
  }
}
