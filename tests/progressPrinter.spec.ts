import { expect, test } from '@playwright/test';
import { ProgressPrinter } from '../packages/reporter/src/lib/progressPrinter';
import type { TestStatus } from '../packages/reporter/src/lib/progressPrinter';

let restoreStdout: (() => void) | null = null;
let fakeTTYActive = false;
const ttyDescriptors = new Map<string, PropertyDescriptor | undefined>();

/**
 * Temporarily replaces process.stdout.write to capture everything written
 * during the test body.
 *
 * @returns The captured write strings and a function that restores stdout.
 */
function captureStdout(): string[] {
  const writes: string[] = [];
  const originalWrite = process.stdout.write.bind(process.stdout);
  process.stdout.write = ((chunk: unknown) => {
    writes.push(String(chunk));
    return true;
  }) as typeof process.stdout.write;
  restoreStdout = () => {
    process.stdout.write = originalWrite;
  };
  return writes;
}

/**
 * Overrides process.stdout.isTTY and columns to emulate a real terminal
 * so the 'line' progress mode renders.
 *
 * @param columns - Terminal column count used for width budgeting.
 * @returns void.
 */
function applyFakeTTY(columns: number): void {
  for (const key of ['isTTY', 'columns'] as const) {
    ttyDescriptors.set(key, Object.getOwnPropertyDescriptor(process.stdout, key));
  }
  Object.defineProperty(process.stdout, 'isTTY', { value: true, configurable: true });
  Object.defineProperty(process.stdout, 'columns', { value: columns, configurable: true });
  fakeTTYActive = true;
}

/**
 * Restores the original isTTY and columns descriptors on process.stdout.
 *
 * @returns void.
 */
function restoreFakeTTY(): void {
  for (const [key, descriptor] of ttyDescriptors) {
    if (descriptor) {
      Object.defineProperty(process.stdout, key, descriptor);
    } else {
      delete (process.stdout as unknown as Record<string, unknown>)[key];
    }
  }
  ttyDescriptors.clear();
  fakeTTYActive = false;
}

test.afterEach(() => {
  if (restoreStdout) {
    restoreStdout();
    restoreStdout = null;
  }
  if (fakeTTYActive) {
    restoreFakeTTY();
  }
});

test.describe('ProgressPrinter Tests', () => {
  function complete(printer: ProgressPrinter, id: string, status: TestStatus): void {
    printer.onWorkerStart(id);
    printer.onTestComplete(id, status, id);
  }

  /**
   * Returns the last captured progress line (the one containing the percent
   * marker) from a set of captured stdout writes.
   *
   * @param writes - Captured stdout write strings.
   * @returns The final rendered progress line, or an empty string.
   */
  function lastLine(writes: string[]): string {
    const line = writes.filter((w) => w.includes('%')).pop();
    return line ?? '';
  }

  test('line mode renders distinct segments for every status', () => {
    const writes = captureStdout();
    applyFakeTTY(200);
    const printer = new ProgressPrinter();
    printer.init(6, 'line');
    complete(printer, 'a', 'passed');
    complete(printer, 'b', 'failed');
    complete(printer, 'c', 'timedOut');
    complete(printer, 'd', 'interrupted');
    complete(printer, 'e', 'skipped');
    complete(printer, 'f', 'flaky');

    expect(lastLine(writes)).toBe(
      '[ 6/6 ] 100% | ✅ 1 | 🔄 1 | ❌ 1 | ⏱️ 1 | ⚡ 1 | ⏭️  1 (0 active workers) | Last: f'
    );
  });

  test('line mode hides zero-count segments', () => {
    const writes = captureStdout();
    applyFakeTTY(200);
    const printer = new ProgressPrinter();
    printer.init(3, 'line');
    complete(printer, 'a', 'passed');
    complete(printer, 'b', 'failed');
    complete(printer, 'c', 'skipped');

    expect(lastLine(writes)).toBe(
      '[ 3/3 ] 100% | ✅ 1 | ❌ 1 | ⏭️  1 (0 active workers) | Last: c'
    );
  });

  test('line mode recounts a test when its retry finishes flaky', () => {
    const writes = captureStdout();
    applyFakeTTY(200);
    const printer = new ProgressPrinter();
    printer.init(1, 'line');
    complete(printer, 'a', 'failed');
    complete(printer, 'a', 'flaky');

    expect(lastLine(writes)).toBe(
      '[ 1/1 ] 100% | ✅ 0 | 🔄 1 | ❌ 0 | ⏭️  0 (0 active workers) | Last: a'
    );
  });

  test('line mode drops the timed out segment when the final attempt fails', () => {
    const writes = captureStdout();
    applyFakeTTY(200);
    const printer = new ProgressPrinter();
    printer.init(1, 'line');
    complete(printer, 'a', 'timedOut');
    complete(printer, 'a', 'failed');

    expect(lastLine(writes)).toBe(
      '[ 1/1 ] 100% | ✅ 0 | ❌ 1 | ⏭️  0 (0 active workers) | Last: a'
    );
  });

  test('line mode counts each test once across duplicate completions', () => {
    const writes = captureStdout();
    applyFakeTTY(200);
    const printer = new ProgressPrinter();
    printer.init(1, 'line');
    complete(printer, 'a', 'failed');
    complete(printer, 'a', 'failed');

    expect(lastLine(writes)).toBe(
      '[ 1/1 ] 100% | ✅ 0 | ❌ 1 | ⏭️  0 (0 active workers) | Last: a'
    );
  });

  test('line mode truncates the line to fit the terminal width', () => {
    const writes = captureStdout();
    applyFakeTTY(40);
    const printer = new ProgressPrinter();
    printer.init(1, 'line');
    printer.onWorkerStart('a');
    printer.onTestComplete('a', 'failed', 'very long test label');

    const line = lastLine(writes);
    expect(line.endsWith('...')).toBe(true);
    expect(line.length).toBeLessThanOrEqual(40);
  });

  test('line mode reset clears counters and test ids', () => {
    const writes = captureStdout();
    applyFakeTTY(200);
    const printer = new ProgressPrinter();
    printer.init(2, 'line');
    complete(printer, 'a', 'passed');
    complete(printer, 'b', 'failed');
    printer.reset();
    printer.init(1, 'line');
    complete(printer, 'c', 'passed');

    expect(lastLine(writes)).toBe(
      '[ 1/1 ] 100% | ✅ 1 | ❌ 0 | ⏭️  0 (0 active workers) | Last: c'
    );
  });

  test('dot mode renders a distinct symbol per status', () => {
    const writes = captureStdout();
    const printer = new ProgressPrinter();
    printer.init(6, 'dot');
    complete(printer, 'a', 'passed');
    complete(printer, 'b', 'failed');
    complete(printer, 'c', 'timedOut');
    complete(printer, 'd', 'interrupted');
    complete(printer, 'e', 'skipped');
    complete(printer, 'f', 'flaky');

    expect(writes.join('')).toBe('.FTIs± [ 6/6 ]\n');
  });

  test('dot mode wraps to a new line with a count after 80 symbols', () => {
    const writes = captureStdout();
    const printer = new ProgressPrinter();
    printer.init(100, 'dot');
    for (let i = 1; i <= 81; i += 1) {
      complete(printer, `t${i}`, 'passed');
    }

    expect(writes.join('')).toBe(`${'.'.repeat(80)} [ 80/100 ]\n.`);
  });
});
