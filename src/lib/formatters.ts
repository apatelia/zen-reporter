/**
 * Calculates integer pass rate percentage safely without false 100% when failures exist or false 0% when passes exist.
 *
 * @param passed - Number of passed tests.
 * @param total - Total number of tests.
 * @returns Pass rate percentage (0-100) or null if total is 0.
 */
export function calculatePassRate(passed: number, total: number): number | null {
  if (!total || total <= 0) return null;
  const rawPct = (passed / total) * 100;

  // Prevent rounding up to 100% when there are failures/non-passed outcomes
  if (passed < total && rawPct >= 99.5) {
    return Math.floor(rawPct);
  }

  // Prevent rounding down to 0% when there are passing tests
  if (passed > 0 && rawPct <= 0.5) {
    return Math.ceil(rawPct);
  }

  return Math.round(rawPct);
}

const DATE_FMT: Intl.DateTimeFormatOptions = {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
};

/**
 * Escapes special HTML characters to prevent XSS injection.
 *
 * @param html - Raw string containing HTML characters.
 * @returns Sanitized HTML string.
 */
export function escapeHTML(html: string): string {
  return html
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Formats a duration in milliseconds into a concise time string (e.g., "450ms", "45s", "3m 15s").
 *
 * @param ms - Duration in milliseconds.
 * @returns Formatted duration string.
 */
export function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;

  const seconds = Math.round(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;

  if (minutes > 0) return `${minutes}m ${secs}s`;

  return `${secs}s`;
}

/**
 * Formats a duration in milliseconds into a decimal seconds string for tooltips and badges (e.g., "2.4s", "450ms").
 *
 * @param ms - Duration in milliseconds, or null/undefined.
 * @returns Formatted verbose duration string.
 */
export function formatDurationVerbose(ms?: number | null): string {
  if (ms === null || ms === undefined || isNaN(ms)) return '0ms';

  if (ms >= 1000) return `${(ms / 1000).toFixed(1)}s`;

  return `${ms}ms`;
}

/**
 * Formats an ISO 8601 timestamp string into a human-readable date and time (e.g. "Sep 20, 2026 · 05:38 AM IST").
 *
 * @param iso - ISO timestamp string.
 * @returns Formatted date and time string.
 */
export function formatDate(iso: string): string {
  const d = new Date(iso);

  return (
    d.toLocaleDateString('en-US', DATE_FMT) +
    ' · ' +
    d.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      timeZoneName: 'short',
    })
  );
}

/**
 * Formats a start and end ISO timestamp into a smart, non-repetitive date-time range string.
 * e.g., "Sep 20, 2026 • 05:38:12 AM – 05:40:26 AM IST" (for same-day runs)
 *
 * @param startIso - Start ISO timestamp.
 * @param endIso - Optional end ISO timestamp.
 * @returns Formatted date range string.
 */
export function formatDateRange(startIso: string, endIso?: string): string {
  if (!startIso) return '';

  const start = new Date(startIso);
  if (isNaN(start.getTime())) return startIso;

  if (!endIso) {
    return formatDate(startIso);
  }

  const end = new Date(endIso);
  if (isNaN(end.getTime())) {
    return formatDate(startIso);
  }

  const startDateStr = start.toLocaleDateString('en-US', DATE_FMT);
  const endDateStr = end.toLocaleDateString('en-US', DATE_FMT);

  const startTimeStr = start.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
  const endTimeStr = end.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    timeZoneName: 'short',
  });

  if (startDateStr === endDateStr) {
    return `${startDateStr}  •  ${startTimeStr} – ${endTimeStr}`;
  }

  const startTimeShort = start.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });

  return `${startDateStr}, ${startTimeShort} – ${endDateStr}, ${endTimeStr}`;
}

/**
 * Splits an ISO timestamp into a human-readable date line ("Sep 18, 2026")
 * and an AM/PM time line ("04:57 AM") for two-line chart labels.
 *
 * @param iso - ISO timestamp string.
 * @returns Tuple of [dateString, timeString].
 */
export function formatDateParts(iso: string): [string, string] {
  const d = new Date(iso);
  const date = d.toLocaleDateString('en-US', DATE_FMT);
  const time = d.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });

  return [date, time];
}

/**
 * Truncates a file name in the middle while preserving its file extension.
 *
 * @param fileName - Spec file name or path.
 * @param maxLength - Maximum allowed string length (default: 40).
 * @returns Truncated file string with ellipsis.
 */
export function truncateFileName(fileName: string, maxLength: number = 40): string {
  if (fileName.length <= maxLength) return fileName;

  const extensionIndex = fileName.lastIndexOf('.');
  const extension = extensionIndex !== -1 ? fileName.slice(extensionIndex) : '';
  const nameWithoutExt = extensionIndex !== -1 ? fileName.slice(0, extensionIndex) : fileName;
  const availableNameLength = maxLength - extension.length - 3;

  if (availableNameLength <= 1) {
    const stemStart = nameWithoutExt.slice(0, Math.max(1, availableNameLength + 3));
    return `${stemStart}...${extension}`;
  }

  const halfLen = Math.floor(availableNameLength / 2);
  const start = nameWithoutExt.slice(0, halfLen + (availableNameLength % 2));
  const end = nameWithoutExt.slice(-halfLen);

  return `${start}...${end}${extension}`;
}

/**
 * Truncates long file directory paths in the middle (e.g., "src/.../spec.ts").
 *
 * @param filePath - Full relative file path string.
 * @returns Path string with middle directory components collapsed into "...".
 */
export function truncateMiddlePath(filePath: string): string {
  if (!filePath) return '';

  const parts = filePath.split('/');
  if (parts.length <= 2) return filePath;

  const fileName = parts[parts.length - 1];
  const rootDir = parts[0] ? parts[0] : parts[1] ? `/${parts[1]}` : '';

  if (parts.length > 3) {
    return `${rootDir}/.../${fileName}`;
  }

  if (parts[0] === '') {
    return filePath;
  }

  return `${parts[0]}/.../${fileName}`;
}
