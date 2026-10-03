import { existsSync, readFileSync, readdirSync } from 'fs';
import { createRequire } from 'module';
import { platform, type } from 'os';
import { resolve } from 'path';

/**
 * Detects the package manager used in the specified directory based on lockfiles or package.json settings.
 *
 * @param {string} [cwd=process.cwd()] - Working directory to inspect.
 * @returns {string} Detected package manager ('pnpm', 'yarn', 'bun', or 'npm').
 */
export function detectPackageManager(cwd = process.cwd()) {
  const lockfiles = [
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
    /* ignore */
  }

  return 'npm';
}

/**
 * Formats a duration in milliseconds into a concise human-readable string (e.g. "45s", "2m 15s").
 *
 * @param {number|null|undefined} ms - Duration in milliseconds.
 * @returns {string} Formatted duration string or empty string if invalid.
 */
export function formatDuration(ms) {
  if (ms === null || ms === undefined || isNaN(ms)) return '';

  const totalSeconds = Math.round(Number(ms) / 1000);

  if (totalSeconds < 60) {
    return `${totalSeconds}s`;
  }

  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${minutes}m ${seconds}s`;
}

/**
 * Converts a snake_case or underscore-separated string into Proper Case / Title Case.
 *
 * @param {string} str - Input string.
 * @returns {string} Proper case string.
 */
export function toProperCase(str) {
  return str
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

/**
 * Checks whether a given value is numeric or represents a formatted number/percentage string.
 *
 * @param {unknown} val - Value to check.
 * @returns {boolean} True if the value is numeric or formatted numeric.
 */
export function isNumericValue(val) {
  if (val === null || val === undefined) return false;

  if (typeof val === 'number') return true;

  if (typeof val === 'string' && val.trim() !== '') {
    if (!isNaN(Number(val))) return true;

    if (/^\d+s$/.test(val) || /^\d+m \d+s$/.test(val) || /^\d+(\.\d+)?%$/.test(val)) return true;
  }

  return false;
}

/**
 * Formats a Date instance or ISO date string into `YYYY-MM-DD HH:mm:ss` format.
 *
 * @param {Date|string|null|undefined} val - Date instance or ISO date string.
 * @returns {string} Formatted date string.
 */
export function formatDate(val) {
  if (val === null || val === undefined || val === '') return '';

  const d = val instanceof Date ? val : new Date(val);

  if (isNaN(d.getTime())) return String(val);

  const pad = (n) => String(n).padStart(2, '0');
  const year = d.getFullYear();
  const month = pad(d.getMonth() + 1);
  const day = pad(d.getDate());
  const hours = pad(d.getHours());
  const mins = pad(d.getMinutes());
  const secs = pad(d.getSeconds());

  return `${year}-${month}-${day} ${hours}:${mins}:${secs}`;
}

/**
 * Centers a string within a specified total character width.
 *
 * @param {string} str - String to pad.
 * @param {number} width - Total target column width.
 * @returns {string} Centered string.
 */
export function padCenter(str, width) {
  const totalPad = width - str.length;

  if (totalPad <= 0) return str;

  const padLeft = Math.floor(totalPad / 2);
  const padRight = totalPad - padLeft;

  return ' '.repeat(padLeft) + str + ' '.repeat(padRight);
}

/**
 * Prints a formatted ASCII table to stdout for CLI output.
 *
 * @param {object} table - Object containing columns array and rows array.
 * @param {string[]} table.columns - Column field names.
 * @param {Record<string, unknown>[]} table.rows - Table row data.
 * @param {string} [emptyMessage='No records found.'] - Fallback message when rows are empty.
 * @param {string} [entityName='records'] - Plural entity name for count summary.
 */
export function printTable(
  { columns, rows },
  emptyMessage = 'No records found.',
  entityName = 'records'
) {
  if (!columns || columns.length === 0) return;

  const displayHeaders = [
    'Sr. No.',
    ...columns.map((c) => {
      let header = c;

      if (header.endsWith('_ms')) {
        header = header.slice(0, -3);
      } else {
        header = header.replace('_ms_', '_');
      }

      return toProperCase(header);
    }),
  ];

  const formattedRows = rows.map((r, idx) => [
    idx + 1,
    ...columns.map((c) => {
      const val = r && c in r ? r[c] : null;

      if (val === null || val === undefined) return '';

      if (c.includes('ms')) {
        return formatDuration(val);
      }

      if (c.endsWith('_at') || val instanceof Date) {
        return formatDate(val);
      }

      return val;
    }),
  ]);

  let stringRows = formattedRows.map((row) =>
    row.map((cell) => {
      if (cell instanceof Date) return formatDate(cell);

      return String(cell);
    })
  );

  const isNumericColumn = [
    true,
    ...columns.map((_, colIdx) => {
      return formattedRows.some((row) => isNumericValue(row[colIdx + 1]));
    }),
  ];

  const termWidth =
    process.stdout.columns && process.stdout.columns > 20 ? process.stdout.columns : 0;

  const wrapCell2Lines = (cellStr, width) => {
    const s = String(cellStr).trim();

    if (s.length <= width) {
      return [s, ''];
    }

    let splitIdx = s.lastIndexOf(' ', width);

    if (splitIdx <= Math.floor(width / 3)) {
      splitIdx = width;
    }

    const line1 = s.slice(0, splitIdx).trimEnd();
    const remainder = s.slice(splitIdx).trimStart();

    if (remainder.length <= width) {
      return [line1, remainder];
    }

    const line2 = width > 3 ? `${remainder.slice(0, width - 3)}...` : remainder.slice(0, width);

    return [line1, line2];
  };

  const header2Lines = displayHeaders.map((h, colIdx) => {
    const s = h.trim();
    const maxValLen = Math.max(
      colIdx === 0 ? String(stringRows.length).length : 0,
      ...stringRows.map((r) => r[colIdx].length)
    );

    if (s.includes(' ') && s.length > Math.max(maxValLen, 6)) {
      const mid = Math.floor(s.length / 2);
      let spaceIdx = s.lastIndexOf(' ', mid);

      if (spaceIdx === -1) spaceIdx = s.indexOf(' ', mid);

      if (spaceIdx !== -1) {
        const line1 = s.slice(0, spaceIdx).trim();
        const line2 = s.slice(spaceIdx + 1).trim();
        return [line1, line2];
      }
    }

    return [s, ''];
  });

  const naturalWidths = displayHeaders.map((_, colIdx) => {
    const [h1, h2] = header2Lines[colIdx];
    const maxValLen = Math.max(
      colIdx === 0 ? String(stringRows.length).length : 0,
      ...stringRows.map((row) => row[colIdx].length)
    );

    return Math.max(h1.length, h2.length, maxValLen);
  });

  let widths = [...naturalWidths];
  const totalCols = displayHeaders.length;

  if (termWidth > 0) {
    const overhead = totalCols * 3 + 1;
    const availableWidth = termWidth - overhead;
    let totalNaturalWidth = naturalWidths.reduce((a, b) => a + b, 0);

    if (totalNaturalWidth > availableWidth && availableWidth > totalCols * 5) {
      const flexIndices = [];
      let fixedWidthSum = 0;

      displayHeaders.forEach((_, idx) => {
        const origCol = idx > 0 ? columns[idx - 1] : '';
        const isFlex =
          idx > 0 && !isNumericColumn[idx] && !origCol.endsWith('_at') && naturalWidths[idx] > 15;

        if (isFlex) {
          flexIndices.push(idx);
        } else {
          fixedWidthSum += naturalWidths[idx];
        }
      });

      if (flexIndices.length > 0) {
        const flexAvailable = Math.max(flexIndices.length * 8, availableWidth - fixedWidthSum);
        const flexNaturalSum = flexIndices.reduce((sum, i) => sum + naturalWidths[i], 0);

        flexIndices.forEach((idx) => {
          const share = Math.floor((naturalWidths[idx] / flexNaturalSum) * flexAvailable);
          widths[idx] = Math.max(8, share);
        });
      }
    }
  }

  const wrappedHeaders = displayHeaders.map((h, i) => {
    const [h1, h2] = header2Lines[i];
    const targetW = widths[i];

    if (h1.length > targetW || h2.length > targetW) {
      return wrapCell2Lines(h, targetW);
    }

    return [h1, h2];
  });

  const hasHeaderLine2 = wrappedHeaders.some((lines) => lines[1].length > 0);

  const formatRow = (cells) => {
    const formattedCells = cells.map((cell, i) => {
      const s = String(cell);
      const w = widths[i];

      if (isNumericColumn[i]) {
        return s.padStart(w);
      }

      return s.padEnd(w);
    });

    return `| ${formattedCells.join(' | ')} |`;
  };

  const border = `+${widths.map((w) => '-'.repeat(w + 2)).join('+')}+`;

  console.log(border);
  console.log(formatRow(wrappedHeaders.map((lines) => lines[0])));

  if (hasHeaderLine2) {
    console.log(formatRow(wrappedHeaders.map((lines) => lines[1])));
  }

  console.log(border);

  if (stringRows.length === 0) {
    const totalInnerWidth = widths.reduce((sum, w) => sum + w + 3, 0) - 1;
    const msg =
      emptyMessage.length > totalInnerWidth - 2
        ? emptyMessage.slice(0, totalInnerWidth - 5) + '...'
        : emptyMessage;

    console.log(`|${padCenter(msg, totalInnerWidth)}|`);
  } else {
    let isFirst = true;

    for (const row of stringRows) {
      if (!isFirst) {
        console.log(border);
      }

      isFirst = false;

      const wrappedCells = row.map((cell, i) => wrapCell2Lines(cell, widths[i]));
      const hasLine2 = wrappedCells.some((lines) => lines[1].length > 0);

      const line1Cells = wrappedCells.map((lines) => lines[0]);
      console.log(formatRow(line1Cells));

      if (hasLine2) {
        const line2Cells = wrappedCells.map((lines) => lines[1]);
        console.log(formatRow(line2Cells));
      }
    }
  }

  console.log(border);

  const label = rows.length === 1 ? entityName.replace(/s$/, '') : entityName;
  console.log(`Total ${rows.length} ${label}.`);
}

/**
 * Returns OS friendly name for system diagnostic output.
 *
 * @returns {string} Operating system name (e.g. 'macOS', 'Windows', 'Linux').
 */
export function getOsName() {
  const p = platform();

  if (p === 'darwin') return 'macOS';
  if (p === 'win32') return 'Windows';
  if (p === 'linux') {
    try {
      if (existsSync('/etc/os-release')) {
        const content = readFileSync('/etc/os-release', 'utf8');
        const match = content.match(/^PRETTY_NAME="?([^"\n]+)"?/m);

        if (match && match[1]) return match[1];
      }
    } catch {
      /* ignore */
    }

    return 'Linux';
  }

  return type();
}

/**
 * Detects installed @playwright/test package version in the project.
 *
 * @param {string} [cwd=process.cwd()] - Project directory path.
 * @returns {string} Installed Playwright version string or 'not installed'.
 */
export function getPlaywrightVersion(cwd = process.cwd()) {
  const require = createRequire(resolve(cwd, 'package.json'));

  try {
    const pwPkg = require('@playwright/test/package.json');

    return pwPkg.version || 'not installed';
  } catch {
    return 'not installed';
  }
}

/**
 * Detects installed zen-reporter package version.
 *
 * @returns {string} Package version string or 'unknown'.
 */
export function getZenReporterVersion() {
  try {
    const pkgPath = resolve(
      import.meta.dirname || new URL('.', import.meta.url).pathname,
      '../../package.json'
    );
    if (existsSync(pkgPath)) {
      const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));

      return pkg.version || 'unknown';
    }
  } catch {
    /* ignore */
  }

  return 'unknown';
}

/**
 * Locates historic run JSONL files in specified runs directory. Exits process if none are found.
 *
 * @param {string} runsDirPath - Resolved path to runs directory.
 * @param {string} historyDir - Relative history directory name for user diagnostic message.
 * @returns {string[]} Array of JSONL file names.
 */
export function findRunFiles(runsDirPath, historyDir) {
  let files = [];

  try {
    files = readdirSync(runsDirPath).filter((f) => f.endsWith('.jsonl'));
  } catch {
    /* runs dir missing */
  }

  if (files.length === 0) {
    console.error(
      `✗ No historic runs found in "${historyDir}/runs". Run your Playwright tests first.`
    );

    process.exit(1);
  }

  return files;
}

/**
 * Initializes and connects to DuckDB in-memory database instance.
 *
 * @returns {Promise<object>} Active DuckDB connection instance.
 */
export async function openDuckDb() {
  try {
    const { DuckDBConnection } = await import('@duckdb/node-api');

    return await DuckDBConnection.create();
  } catch (e) {
    if (e?.code === 'ERR_MODULE_NOT_FOUND') {
      console.error('✗ @duckdb/node-api is not installed. Install it to use "zr history":');
      console.error('  npm i -D @duckdb/node-api');

      process.exit(1);
    }

    throw e;
  }
}

/**
 * Executes a DuckDB query and formats query results into columns and JS row objects.
 *
 * @param {object} conn - Active DuckDB connection.
 * @param {string} sql - SQL query string to execute.
 * @param {unknown[]} [params] - Query parameters.
 * @returns {Promise<{ columns: string[], rows: Record<string, unknown>[] }>} Formatted query result.
 */
export async function runQuery(conn, sql, params) {
  const reader = await conn.runAndReadAll(sql, params);
  const columns = reader.columnNames();
  const rawRows = reader.getRowsJS();
  const rows = rawRows.map((r) => {
    const obj = {};

    columns.forEach((c, i) => {
      let v = r[i];
      if (typeof v === 'bigint') v = Number(v);
      obj[c] = v ?? null;
    });

    return obj;
  });

  return { columns, rows };
}

export const SRC = "read_json(?, format='newline_delimited')";
export const RUNS_SQL = `SELECT DISTINCT run_name, started_at, run_duration_ms, run_total, run_passed, run_failed, run_timed_out, run_skipped, run_interrupted FROM ${SRC} ORDER BY started_at DESC`;
export const FLAKY_SQL = `SELECT suite, file, title, project, count(*) FILTER (status IN ('failed', 'timedOut')) AS failed_runs, count(*) FILTER (status = 'passed') AS passed_runs, sum(passed_on_retry) AS recovered_by_retry, count(*) AS total_runs FROM ${SRC} GROUP BY suite, file, title, project HAVING failed_runs > 0 AND passed_runs > 0 ORDER BY failed_runs DESC, passed_runs DESC`;
export const REGRESSIONS_SQL = `WITH run_tests AS (SELECT run_id, run_name, suite, file, title, project, max(started_at) AS started_at, CASE WHEN count(*) FILTER (status = 'failed') > 0 THEN 'failed' WHEN count(*) FILTER (status = 'timedOut') > 0 THEN 'timedOut' WHEN count(*) FILTER (status = 'interrupted') > 0 THEN 'interrupted' WHEN count(*) FILTER (status = 'skipped') > 0 THEN 'skipped' ELSE 'passed' END AS status FROM ${SRC} GROUP BY run_id, run_name, suite, file, title, project), ordered AS (SELECT run_id, run_name, started_at, suite, file, title, project, status, row_number() OVER (PARTITION BY suite, file, title, project ORDER BY started_at, run_id) AS seq FROM run_tests), regressions AS (SELECT b.run_name AS regressed_in, b.started_at AS regressed_at, b.suite AS suite, b.file AS file, b.title AS title, b.project AS project FROM ordered b JOIN ordered a ON a.suite = b.suite AND a.file = b.file AND a.title = b.title AND a.project = b.project AND b.seq = a.seq + 1 WHERE a.status = 'passed' AND b.status IN ('failed', 'timedOut', 'interrupted')), latest AS (SELECT run_id, run_name, started_at, status, suite, file, title, project, row_number() OVER (PARTITION BY suite, file, title, project ORDER BY started_at DESC, run_id DESC) AS rn FROM run_tests) SELECT r.suite, r.file, r.title, r.project, r.regressed_in, r.regressed_at, l.status AS last_status, l.started_at AS last_run_at FROM (SELECT r.*, row_number() OVER (PARTITION BY suite, file, title, project ORDER BY regressed_at DESC) AS rn FROM regressions r) r JOIN latest l ON l.suite = r.suite AND l.file = r.file AND l.title = r.title AND l.project = r.project AND l.rn = 1 WHERE r.rn = 1 ORDER BY l.started_at DESC`;
export const SLOW_SQL = `SELECT suite, file, title, project, round(avg(duration_ms), 1) AS avg_duration_ms, max(duration_ms) AS max_duration_ms, arg_max(duration_ms, started_at) AS last_duration_ms, count(*) AS runs FROM ${SRC} GROUP BY suite, file, title, project ORDER BY avg(duration_ms) DESC LIMIT ?`;
export const TREND_SQL = `SELECT run_name, started_at, run_total, run_passed, run_failed, round(100.0 * run_passed / nullif(run_total, 0), 1) AS pass_rate FROM ${SRC} GROUP BY run_id, run_name, started_at, run_total, run_passed, run_failed ORDER BY started_at`;
export const PROJECT_DURATIONS_SQL = `SELECT run_id, started_at, project, round(sum(duration_ms) / 1000.0, 2) AS duration_sec FROM ${SRC} WHERE project IS NOT NULL AND project != '' GROUP BY run_id, started_at, project ORDER BY started_at ASC`;
export const FILES_SQL = `SELECT run_id, started_at, file, count(*) AS total, count(*) FILTER (status = 'passed') AS passed, count(*) FILTER (status = 'failed') AS failed, count(*) FILTER (status = 'timedOut') AS timed_out, count(*) FILTER (status = 'interrupted') AS interrupted, count(*) FILTER (status = 'skipped') AS skipped FROM ${SRC} WHERE file IS NOT NULL AND file != '' GROUP BY run_id, started_at, file ORDER BY started_at ASC, file ASC`;
export const FILES_SUMMARY_SQL = `SELECT file, count(DISTINCT run_id) AS runs, count(*) AS total_tests, count(*) FILTER (status = 'passed') AS passed, count(*) FILTER (status = 'failed') AS failed, count(*) FILTER (status = 'timedOut') AS timed_out, count(*) FILTER (status = 'interrupted') AS interrupted, count(*) FILTER (status = 'skipped') AS skipped, round(100.0 * count(*) FILTER (status = 'passed') / nullif(count(*), 0), 1) AS pass_rate FROM ${SRC} WHERE file IS NOT NULL AND file != '' GROUP BY file ORDER BY total_tests DESC`;
export const TESTS_SQL = `SELECT run_id, started_at, suite, file, title, project, count(*) AS total, count(*) FILTER (status = 'passed') AS passed, count(*) FILTER (status = 'failed') AS failed, count(*) FILTER (status = 'timedOut') AS timed_out, count(*) FILTER (status = 'interrupted') AS interrupted, count(*) FILTER (status = 'skipped') AS skipped, round(avg(duration_ms), 1) AS avg_duration_ms FROM ${SRC} WHERE title IS NOT NULL AND title != '' GROUP BY run_id, started_at, suite, file, title, project ORDER BY started_at ASC, file ASC, title ASC`;
export const TESTS_SUMMARY_SQL = `SELECT suite, file, title, project, count(DISTINCT run_id) AS runs, count(*) AS total_executions, count(*) FILTER (status = 'passed') AS passed, count(*) FILTER (status = 'failed') AS failed, count(*) FILTER (status = 'timedOut') AS timed_out, count(*) FILTER (status = 'interrupted') AS interrupted, count(*) FILTER (status = 'skipped') AS skipped, round(avg(duration_ms), 1) AS avg_duration_ms, round(100.0 * count(*) FILTER (status = 'passed') / nullif(count(*), 0), 1) AS pass_rate FROM ${SRC} WHERE title IS NOT NULL AND title != '' GROUP BY suite, file, title, project ORDER BY total_executions DESC`;
