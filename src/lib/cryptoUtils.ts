import { formatDuration } from './formatters';
import type { FailedTest } from './statsUtils';
import type { Attachment, ResultSummary } from './types/report';

/**
 * Normalizes error messages and stack traces by masking dynamic tokens (timestamps,
 * pointers, line numbers, ports, durations) so identical failure causes yield the same signature.
 *
 * @param message - Raw error message string.
 * @param stack - Raw error stack trace string.
 * @returns Masked, normalized error signature string.
 */
export function normalizeErrorText(message: string, stack: string): string {
  const normMsg = (message || '')
    .replace(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z?/gi, '<TIMESTAMP>')
    .replace(/0x[a-fA-F0-9]+/g, '<PTR>')
    .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, '<UUID>')
    .replace(/localhost:\d+/g, '<HOST>')
    .replace(/\d+ms/gi, '<DURATION>')
    .replace(/:\d+:\d+/g, ':<LINE>:<COL>');

  const normStack = (stack || '')
    .split('\n')
    .filter((line) => !line.includes('node_modules') && !line.includes('internal/'))
    .slice(0, 4)
    .join('\n')
    .replace(/:\d+:\d+/g, ':<LINE>:<COL>');

  return `${normMsg.trim()}\n${normStack.trim()}`;
}

/**
 * Performs a 32-bit right rotation on a numeric value.
 *
 * @param value - 32-bit integer value.
 * @param amount - Bit offset to rotate right by.
 * @returns Rotated 32-bit integer.
 */
function rightRotate(value: number, amount: number): number {
  return (value >>> amount) | (value << (32 - amount));
}

/**
 * Pure JavaScript synchronous SHA-256 hash generator for string inputs.
 *
 * @param str - Input string to compute hash for.
 * @returns 64-character hexadecimal SHA-256 hash string.
 */
export function sha256Sync(str: string): string {
  const mathPow = Math.pow;
  const maxWord = mathPow(2, 32);
  const hash: number[] = [];
  const k: number[] = [];
  let primeCounter = 0;

  const isComposite: Record<number, boolean> = {};
  for (let candidate = 2; primeCounter < 64; candidate++) {
    if (!isComposite[candidate]) {
      for (let i = 0; i < 313; i += candidate) {
        isComposite[i] = true;
      }
      if (primeCounter < 8) {
        hash[primeCounter] = (mathPow(candidate, 1 / 2) * maxWord) | 0;
      }
      k[primeCounter] = (mathPow(candidate, 1 / 3) * maxWord) | 0;
      primeCounter++;
    }
  }

  let wordsStr = str + '\x80';
  while (wordsStr.length % 64 !== 56) wordsStr += '\x00';

  const words: number[] = [];
  const asciiBitLength = str.length * 8;

  for (let i = 0; i < wordsStr.length; i++) {
    const charCode = wordsStr.charCodeAt(i);
    words[i >> 2] |= charCode << (((3 - i) % 4) * 8);
  }

  words[words.length] = (asciiBitLength / maxWord) | 0;
  words[words.length] = asciiBitLength;

  for (let j = 0; j < words.length;) {
    const w = words.slice(j, (j += 16));
    const oldHash = hash.slice(0);

    for (let i = 0; i < 64; i++) {
      const w15 = w[i - 15],
        w2 = w[i - 2];
      const a = hash[0],
        e = hash[4];
      const temp1 =
        hash[7] +
        (rightRotate(e, 6) ^ rightRotate(e, 11) ^ rightRotate(e, 25)) +
        ((e & hash[5]) ^ (~e & hash[6])) +
        k[i] +
        (w[i] =
          i < 16
            ? w[i]
            : (w[i - 16] +
                (rightRotate(w15, 7) ^ rightRotate(w15, 18) ^ (w15 >>> 3)) +
                w[i - 7] +
                (rightRotate(w2, 17) ^ rightRotate(w2, 19) ^ (w2 >>> 10))) |
              0);
      const temp2 =
        (rightRotate(a, 2) ^ rightRotate(a, 13) ^ rightRotate(a, 22)) +
        ((a & hash[1]) ^ (a & hash[2]) ^ (hash[1] & hash[2]));

      hash[7] = hash[6];
      hash[6] = hash[5];
      hash[5] = hash[4];
      hash[4] = (hash[3] + temp1) | 0;
      hash[3] = hash[2];
      hash[2] = hash[1];
      hash[1] = hash[0];
      hash[0] = (temp1 + temp2) | 0;
    }

    for (let i = 0; i < 8; i++) {
      hash[i] = (hash[i] + oldHash[i]) | 0;
    }
  }

  let result = '';
  for (let i = 0; i < 8; i++) {
    for (let j = 3; j >= 0; j--) {
      const b = (hash[i] >> (j * 8)) & 255;
      result += (b < 16 ? '0' : '') + b.toString(16);
    }
  }

  return result;
}

export interface ErrorSignatureDetails {
  hash: string;
  shortHash: string;
  representativeMessage: string;
}

/**
 * Computes a deterministic SHA-256 signature and short hash for a failed test's error message and stack trace.
 *
 * @param test - Failed test structure.
 * @returns ErrorSignatureDetails object containing full hash, short hash, and first message line.
 */
export function getErrorSignature(test: FailedTest): ErrorSignatureDetails {
  const err = test.errors?.[0];
  const msg = err?.message || test.type || 'Unknown Failure';
  const stack = err?.stack || '';
  const normalized = normalizeErrorText(msg, stack);
  const hash =
    sha256Sync(normalized) || 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';
  return {
    hash,
    shortHash: `sha256:${hash.slice(0, 8)}`,
    representativeMessage: msg.split('\n')[0],
  };
}

export interface VisualDiffPair {
  actualUrl: string;
  expectedUrl: string;
  diffUrl?: string;
  name?: string;
}

/**
 * Scans an array of test attachments and pairs matching actual, expected (baseline), and diff images for visual regression comparison.
 *
 * @param attachments - Test case attachment models.
 * @param getAttachmentUrl - Resolver function returning image URLs from attachments.
 * @returns Array of paired VisualDiffPair structures.
 */
export function extractVisualDiffPairs(
  attachments: Attachment[],
  getAttachmentUrl: (att: Attachment) => string | null
): VisualDiffPair[] {
  if (!attachments || attachments.length === 0) return [];

  const pairs: VisualDiffPair[] = [];
  const imageAttachments = attachments.filter((att) => {
    const url = getAttachmentUrl(att);
    if (!url) return false;
    return (
      (att.contentType && att.contentType.startsWith('image/')) ||
      /\.(png|jpe?g|gif|webp|svg)$/i.test(att.name || att.path || '')
    );
  });

  const groups = new Map<
    string,
    { actualUrl?: string; expectedUrl?: string; diffUrl?: string; name: string }
  >();

  for (const att of imageAttachments) {
    const url = getAttachmentUrl(att);
    if (!url) continue;

    const name = att.name || '';
    let baseName = name;
    let type: 'actual' | 'expected' | 'diff' | null = null;

    if (
      /-actual(\.png)?$/i.test(name) ||
      /-received(\.png)?$/i.test(name) ||
      /actual/i.test(name)
    ) {
      type = 'actual';
      baseName = name.replace(/-(actual|received)(\.png)?$/i, '');
    } else if (
      /-expected(\.png)?$/i.test(name) ||
      /-baseline(\.png)?$/i.test(name) ||
      /expected|baseline/i.test(name)
    ) {
      type = 'expected';
      baseName = name.replace(/-(expected|baseline)(\.png)?$/i, '');
    } else if (/-diff(\.png)?$/i.test(name) || /diff/i.test(name)) {
      type = 'diff';
      baseName = name.replace(/-diff(\.png)?$/i, '');
    }

    if (type) {
      if (!groups.has(baseName)) {
        groups.set(baseName, { name: baseName });
      }

      const g = groups.get(baseName)!;

      if (type === 'actual') g.actualUrl = url;
      if (type === 'expected') g.expectedUrl = url;
      if (type === 'diff') g.diffUrl = url;
    }
  }

  for (const g of groups.values()) {
    if (g.actualUrl && g.expectedUrl) {
      pairs.push({
        actualUrl: g.actualUrl,
        expectedUrl: g.expectedUrl,
        diffUrl: g.diffUrl,
        name: g.name,
      });
    }
  }

  return pairs;
}

/**
 * Generates an ASCII terminal summary table string summarizing run counts, status, duration, and pass rate.
 *
 * @param summary - ResultSummary object.
 * @param projectName - Optional project name for title line.
 * @param testRunName - Optional test run name for title line.
 * @returns ASCII formatted table string for terminal display.
 */
export function generateTerminalSummaryTable(
  summary: ResultSummary,
  projectName?: string,
  testRunName?: string
): string {
  const total = summary.total || 0;
  const passed = summary.passed || 0;
  const failed = summary.failed || 0;
  const timedOut = summary.timedOut || 0;
  const skipped = summary.skipped || 0;
  const interrupted = summary.interrupted || 0;
  const hasFailures = failed > 0 || timedOut > 0 || interrupted > 0;
  const statusStr = hasFailures ? 'FAILED' : 'PASSED';
  const passRate = total > 0 ? `${((passed / total) * 100).toFixed(1).replace(/\.0$/, '')}%` : '0%';
  const durationStr = formatDuration(summary.duration || 0);

  const headers = [
    'Status',
    'Duration',
    'Pass Rate',
    'Total',
    'Passed',
    'Failed',
    'Timed Out',
    'Skipped',
  ];
  const values = [
    statusStr,
    durationStr,
    passRate,
    String(total),
    String(passed),
    String(failed),
    String(timedOut),
    String(skipped),
  ];

  if (interrupted > 0) {
    headers.push('Interrupted');
    values.push(String(interrupted));
  }

  const widths = headers.map((h, i) => Math.max(h.length, values[i].length));

  const border = `+${widths.map((w) => '-'.repeat(w + 2)).join('+')}+`;
  const formatRow = (cells: string[]) =>
    `| ${cells.map((c, i) => c.padEnd(widths[i])).join(' | ')} |`;

  const titleProject = projectName || 'Test Automation Project';
  const titleRun = testRunName || 'Test Run';
  const titleLine = `Test Summary: ${titleProject} — ${titleRun}`;

  return `${titleLine}\n${border}\n${formatRow(headers)}\n${border}\n${formatRow(values)}\n${border}`;
}
