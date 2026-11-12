import { existsSync, readdirSync, statSync, writeFileSync, mkdirSync } from 'fs';
import { dirname, relative, resolve } from 'path';
import * as clack from '@clack/prompts';
import pc from 'picocolors';
import { exportToCsvString, generateExportFilename } from '@arpanp/zen-core';

export { getOsName, getPlaywrightVersion, getZenReporterVersion } from './system.js';

/**
 * Checks SQLite history database file size and outputs proactive maintenance tips if size exceeds thresholds.
 *
 * @param {string} historyDir - Output directory name.
 * @param {string} [cwd=process.cwd()] - Current working directory.
 */
export function checkDatabaseSizeWarning(historyDir, cwd = process.cwd()) {
  const dbPath = resolve(cwd, historyDir, 'history.db');
  if (!existsSync(dbPath)) return;

  try {
    const stats = statSync(dbPath);
    const sizeBytes = stats.size;
    const mb = (sizeBytes / (1024 * 1024)).toFixed(1);

    // Warning threshold: >= 250 MB
    if (sizeBytes >= 250 * 1024 * 1024) {
      console.warn(
        `\n\x1b[33m⚠️  Notice: SQLite history database (${historyDir}/history.db) has reached ${mb} MB.\x1b[0m`
      );
      console.warn(
        `\x1b[33m   Consider cleaning old runs to maintain snappy load times and recover disk space:\x1b[0m`
      );
      console.warn(`   \x1b[36m${'npx'} zr history clean --keep 50\x1b[0m\n`);
    }
  } catch {
    /* ignore stat errors */
  }
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
function toProperCase(str) {
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
function isNumericValue(val) {
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
 * @param {object} [options] - Additional table formatting options.
 * @param {number} [options.offset=0] - 0-based offset for Sr. No. numbering.
 * @param {number} [options.totalCount] - Total count of records across all pages, if paginated.
 * @returns {void}
 */
export function printTable(
  { columns, rows },
  emptyMessage = 'No records found.',
  entityName = 'records',
  options = {}
) {
  if (!columns || columns.length === 0) return;

  const { offset = 0, totalCount } = options;

  const displayHeaders = [
    'Sr. No.',
    ...columns.map((c) => {
      let header = c;

      if (header === 'last_seen_at') {
        return 'Last Run At';
      }

      if (header.endsWith('_ms')) {
        header = header.slice(0, -3);
      } else {
        header = header.replace('_ms_', '_');
      }

      return toProperCase(header);
    }),
  ];

  const formattedRows = rows.map((r, idx) => [
    offset + idx + 1,
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

  const formatHeaderRow = (cells) => {
    const formattedCells = cells.map((cell, i) => {
      const s = String(cell);
      const w = widths[i];
      const padded = isNumericColumn[i] ? s.padStart(w) : s.padEnd(w);
      return pc.cyan(pc.bold(padded));
    });

    const vBar = pc.dim('│');
    return `${vBar} ${formattedCells.join(` ${vBar} `)} ${vBar}`;
  };

  const colorizeCell = (text, colIdx) => {
    if (!text) return text;
    if (colIdx === 0) {
      return pc.dim(text);
    }
    const colName = colIdx > 0 ? (columns[colIdx - 1] || '').toLowerCase() : '';

    if (colName === 'status') {
      const lower = text.toLowerCase();
      if (lower === 'passed') return pc.green(text);
      if (lower === 'failed') return pc.red(text);
      if (lower === 'flaky' || lower === 'timed out' || lower === 'timed_out')
        return pc.yellow(text);
      if (lower === 'skipped') return pc.gray(text);
      if (lower === 'interrupted') return pc.magenta(text);
    }

    if (colName.includes('pass_rate') || colName.includes('pass_ratio')) {
      const num = parseFloat(text);
      if (!isNaN(num)) {
        if (num >= 95) return pc.green(text);
        if (num >= 80) return pc.yellow(text);
        return pc.red(text);
      }
    }

    if (colName === 'failed' || colName.includes('fail')) {
      const num = parseInt(text, 10);
      if (num > 0) return pc.red(text);
      return pc.dim(text);
    }

    if (colName === 'passed' || colName.includes('pass')) {
      const num = parseInt(text, 10);
      if (num > 0) return pc.green(text);
      return pc.dim(text);
    }

    if (colName.includes('timed') || colName.includes('flaky') || colName.includes('interrupted')) {
      const num = parseInt(text, 10);
      if (num > 0) return pc.yellow(text);
      return pc.dim(text);
    }

    if (colName.endsWith('_at') || colName === 'started_at') {
      return pc.dim(text);
    }

    return text;
  };

  const formatDataRow = (cells) => {
    const formattedCells = cells.map((cell, i) => {
      const s = String(cell);
      const w = widths[i];
      const padded = isNumericColumn[i] ? s.padStart(w) : s.padEnd(w);
      return colorizeCell(padded, i);
    });

    const vBar = pc.dim('│');
    return `${vBar} ${formattedCells.join(` ${vBar} `)} ${vBar}`;
  };

  const topBorder = pc.dim(`┌${widths.map((w) => '─'.repeat(w + 2)).join('┬')}┐`);
  const headerSeparator = pc.dim(`├${widths.map((w) => '─'.repeat(w + 2)).join('┼')}┤`);
  const rowSeparator = pc.dim(`├${widths.map((w) => '─'.repeat(w + 2)).join('┼')}┤`);
  const bottomBorder = pc.dim(`└${widths.map((w) => '─'.repeat(w + 2)).join('┴')}┘`);

  console.log(topBorder);
  console.log(formatHeaderRow(wrappedHeaders.map((lines) => lines[0])));

  if (hasHeaderLine2) {
    console.log(formatHeaderRow(wrappedHeaders.map((lines) => lines[1])));
  }

  console.log(headerSeparator);

  if (stringRows.length === 0) {
    const totalInnerWidth = widths.reduce((sum, w) => sum + w + 3, 0) - 1;
    const msg =
      emptyMessage.length > totalInnerWidth - 2
        ? emptyMessage.slice(0, totalInnerWidth - 5) + '...'
        : emptyMessage;

    const vBar = pc.dim('│');
    console.log(`${vBar}${padCenter(pc.dim(msg), totalInnerWidth)}${vBar}`);
  } else {
    let isFirst = true;

    for (const row of stringRows) {
      if (!isFirst) {
        console.log(rowSeparator);
      }

      isFirst = false;

      const wrappedCells = row.map((cell, i) => wrapCell2Lines(cell, widths[i]));
      const hasLine2 = wrappedCells.some((lines) => lines[1].length > 0);

      const line1Cells = wrappedCells.map((lines) => lines[0]);
      console.log(formatDataRow(line1Cells));

      if (hasLine2) {
        const line2Cells = wrappedCells.map((lines) => lines[1]);
        console.log(formatDataRow(line2Cells));
      }
    }
  }

  console.log(bottomBorder);

  const total = typeof totalCount === 'number' ? totalCount : rows.length;
  const label = total === 1 ? entityName.replace(/s$/, '') : entityName;

  if (typeof totalCount === 'number' && totalCount > rows.length) {
    const endIdx = offset + rows.length;
    console.log(
      pc.dim(`Showing ${offset + 1}-${endIdx} of ${totalCount} ${label}.`) +
        pc.dim(` (Use --all or --limit <N> to show more)`)
    );
  } else {
    console.log(pc.dim(`Total ${total} ${label}.`));
  }
}

/**
 * Handles pagination over large tabular datasets across interactive and non-interactive environments.
 *
 * @param {object} table - Object containing columns array and rows array.
 * @param {string[]} table.columns - Column field names.
 * @param {Record<string, unknown>[]} table.rows - Full dataset rows.
 * @param {string} [emptyMessage='No records found.'] - Fallback message.
 * @param {string} [entityName='records'] - Plural entity name.
 * @param {object} [options] - Pagination options.
 * @param {number} [options.pageSize=25] - Default number of records per page.
 * @param {boolean} [options.all=false] - If true, show all records without paging.
 * @param {number} [options.limit] - Explicit record limit requested by the user.
 * @param {boolean} [options.interactive=false] - Whether running in interactive menu mode.
 * @returns {Promise<void>}
 */
export async function printPaginatedTable(
  { columns, rows },
  emptyMessage = 'No records found.',
  entityName = 'records',
  options = {}
) {
  if (!rows || rows.length === 0) {
    printTable({ columns, rows: [] }, emptyMessage, entityName);
    return;
  }

  const { pageSize = 25, all = false, limit, interactive = false } = options;

  if (all || (limit !== undefined && limit >= rows.length)) {
    printTable({ columns, rows }, emptyMessage, entityName);
    return;
  }

  if (limit !== undefined) {
    const limitedRows = rows.slice(0, limit);
    printTable({ columns, rows: limitedRows }, emptyMessage, entityName, {
      totalCount: rows.length,
    });
    return;
  }

  // If total rows fit within a single page, print immediately
  if (rows.length <= pageSize) {
    printTable({ columns, rows }, emptyMessage, entityName);
    return;
  }

  // In non-interactive/CI mode: print first page with footer note
  if (!interactive && !(process.stdin.isTTY && process.stdout.isTTY)) {
    const firstPage = rows.slice(0, pageSize);
    printTable({ columns, rows: firstPage }, emptyMessage, entityName, {
      totalCount: rows.length,
    });
    return;
  }

  // Interactive pagination loop
  let currentOffset = 0;

  while (currentOffset < rows.length) {
    const currentRows = rows.slice(currentOffset, currentOffset + pageSize);
    printTable({ columns, rows: currentRows }, emptyMessage, entityName, {
      offset: currentOffset,
      totalCount: rows.length,
    });

    currentOffset += currentRows.length;
    const remaining = rows.length - currentOffset;

    if (remaining <= 0) {
      break;
    }

    const nextBatchSize = Math.min(pageSize, remaining);
    const action = await clack.select({
      message: `Paging: ${remaining} more ${entityName} available. ${pc.dim('(Esc to finish & go back)')}`,
      options: [
        {
          value: 'next',
          label: `Next ${nextBatchSize}`,
          hint: `Show items ${currentOffset + 1} to ${currentOffset + nextBatchSize}`,
        },
        {
          value: 'all',
          label: `Show All Remaining (${remaining})`,
          hint: `Display all ${rows.length} ${entityName} at once`,
        },
        {
          value: 'export',
          label: `Export All to CSV`,
          hint: `Save complete dataset (${rows.length} ${entityName}) to CSV file`,
        },
        { value: 'done', label: `← Finish & Back`, hint: `Return to menu` },
      ],
    });

    if (clack.isCancel(action) || action === 'done') {
      break;
    }

    if (action === 'export') {
      const defaultFilename = generateExportFilename(entityName.replace(/\s+/g, '-'));
      exportTableToCsv({ columns, rows }, defaultFilename);
      break;
    }

    if (action === 'all') {
      const remainingRows = rows.slice(currentOffset);
      printTable({ columns, rows: remainingRows }, emptyMessage, entityName, {
        offset: currentOffset,
        totalCount: rows.length,
      });
      break;
    }
  }
}

/**
 * Exports a tabular dataset to an RFC 4180 compliant CSV file on disk.
 *
 * @param {object} table - Object containing columns array and rows array.
 * @param {string[]} table.columns - Column field names.
 * @param {Record<string, unknown>[]} table.rows - Table rows to export.
 * @param {string} [defaultFilename='export.csv'] - Auto-generated fallback file name.
 * @param {string} [targetPath] - User-specified destination file path.
 * @param {string} [historyDir='zen-report'] - Report/history directory name.
 * @param {string} [cwd=process.cwd()] - Current working directory.
 * @returns {string} Absolute path to the generated CSV file.
 */
export function exportTableToCsv(
  { columns, rows },
  defaultFilename = 'export.csv',
  targetPath = undefined,
  historyDir = process.env.PW_REPORTER_OUTPUT || 'zen-report',
  cwd = process.cwd()
) {
  if (!columns || columns.length === 0) {
    throw new Error('Cannot export table: no columns provided.');
  }

  const exportColumns = [
    {
      header: 'Sr. No.',
      getValue: (_item, idx) => idx + 1,
    },
    ...columns.map((c) => {
      let header = c;
      if (header === 'last_seen_at') {
        header = 'Last Run At';
      } else if (header.endsWith('_ms')) {
        header = header.slice(0, -3);
      } else {
        header = header.replace('_ms_', '_');
      }

      const formattedHeader = toProperCase(header);

      return {
        header: formattedHeader,
        getValue: (item) => {
          const val = item && c in item ? item[c] : null;
          if (val === null || val === undefined) return '';
          if (c.includes('ms')) return formatDuration(val);
          if (c.endsWith('_at') || val instanceof Date) return formatDate(val);
          return val;
        },
      };
    }),
  ];

  const csvContent = exportToCsvString(rows || [], exportColumns);

  let outPath;
  if (targetPath) {
    outPath = resolve(cwd, targetPath);
  } else {
    outPath = resolve(cwd, historyDir, defaultFilename);
  }

  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, csvContent, 'utf8');

  const relPath = relative(cwd, outPath) || outPath;
  console.log(pc.green(`✓ Exported ${rows ? rows.length : 0} records to "${relPath}"`));

  return outPath;
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

  const dbPath = resolve(runsDirPath, '..', 'history.db');
  if (files.length === 0 && !existsSync(dbPath)) {
    throw new Error(`No historic runs found in "${historyDir}". Run your Playwright tests first.`);
  }

  return files;
}

/**
 * Prepares the DuckDB source view `history_src` from either `history.db` (SQLite)
 * or fallback newline-delimited JSONL files.
 *
 * @param {object} conn - Active DuckDB connection.
 * @param {string} historyDir - Output directory name.
 * @param {string} [cwd=process.cwd()] - Current working directory.
 * @returns {Promise<{ isSqlite: boolean, target: string }>} Source details.
 */
export async function setupHistorySource(conn, historyDir, cwd = process.cwd()) {
  const dbPath = resolve(cwd, historyDir, 'history.db');
  const runsGlob = `${resolve(cwd, historyDir, 'runs')}/*.jsonl`;

  if (existsSync(dbPath)) {
    // Sanitize path against control characters and quote sequences
    const sanitizedDbPath = resolve(dbPath);
    if (/[\0\r\n]/.test(sanitizedDbPath)) {
      throw new Error(`Invalid characters in SQLite database path: "${sanitizedDbPath}"`);
    }
    const escapedPath = sanitizedDbPath.replace(/'/g, "''");
    await conn.run(`ATTACH IF NOT EXISTS '${escapedPath}' AS history (TYPE SQLITE)`);
    await conn.run(`CREATE OR REPLACE VIEW history_src AS
      SELECT
        r.run_id,
        r.run_name,
        r.project_name,
        r.started_at,
        r.ended_at,
        r.run_duration_ms,
        r.run_sequential_duration_ms,
        r.run_total,
        r.run_passed,
        r.run_flaky,
        r.run_failed,
        r.run_skipped,
        r.run_timed_out,
        r.run_interrupted,
        r.run_workers,
        r.run_projects,
        r.step_assertions,
        r.step_actions,
        r.step_network,
        r.step_hooks,
        r.step_waits,
        r.step_others,
        r.git_branch,
        r.git_commit,
        r.git_commit_full,
        t.file,
        t.suite,
        t.title,
        t.project,
        t.status,
        t.duration_ms,
        t.attempts,
        t.failed_attempts,
        t.passed_on_retry,
        t.error_message,
        t.error_stack,
        t.error_file,
        t.error_line,
        t.tags
      FROM history.history_runs r
      LEFT JOIN history.history_test_cases t ON r.run_id = t.run_id
    `);
    return { isSqlite: true, target: dbPath };
  } else {
    const escapedGlob = runsGlob.replace(/'/g, "''");
    await conn.run(
      `CREATE OR REPLACE VIEW history_src AS SELECT * FROM read_json('${escapedGlob}', format='newline_delimited', union_by_name=true)`
    );
    return { isSqlite: false, target: runsGlob };
  }
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
    if (e?.code === 'ERR_MODULE_NOT_FOUND' || e?.code === 'MODULE_NOT_FOUND') {
      throw new Error(
        '@duckdb/node-api is not installed. Install it to use "zr history":\n  npm i -D @duckdb/node-api',
        { cause: e }
      );
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

export const SRC = 'history_src';
export const RUNS_SQL = `SELECT DISTINCT run_name, started_at, run_duration_ms AS duration_ms, count(DISTINCT file) AS files, run_total AS tests, run_passed AS passed, coalesce(run_flaky, 0) AS flaky, run_failed AS failed, run_timed_out AS timed_out, run_skipped AS skipped, run_interrupted AS interrupted FROM ${SRC} GROUP BY run_name, started_at, run_duration_ms, run_total, run_passed, run_flaky, run_failed, run_timed_out, run_skipped, run_interrupted ORDER BY started_at DESC`;
export const FLAKY_SQL = `SELECT suite, file, title, project, count(*) FILTER (status IN ('failed', 'timedOut')) AS failed_runs, count(*) FILTER (status = 'passed') AS passed_runs, sum(passed_on_retry) AS recovered_by_retry, count(*) AS total_runs, max(started_at) FILTER (status IN ('failed', 'timedOut') OR passed_on_retry > 0) AS last_flaky_at, max(started_at) AS last_seen_at FROM ${SRC} GROUP BY suite, file, title, project HAVING (failed_runs > 0 AND passed_runs > 0) OR sum(passed_on_retry) > 0 ORDER BY failed_runs DESC, passed_runs DESC`;
export const REGRESSIONS_SQL = `WITH run_tests AS (SELECT run_id, run_name, suite, file, title, project, max(started_at) AS started_at, CASE WHEN count(*) FILTER (status = 'failed') > 0 THEN 'failed' WHEN count(*) FILTER (status = 'timedOut') > 0 THEN 'timedOut' WHEN count(*) FILTER (status = 'interrupted') > 0 THEN 'interrupted' WHEN count(*) FILTER (status = 'skipped') > 0 THEN 'skipped' ELSE 'passed' END AS status FROM ${SRC} GROUP BY run_id, run_name, suite, file, title, project), ordered AS (SELECT run_id, run_name, started_at, suite, file, title, project, status, row_number() OVER (PARTITION BY suite, file, title, project ORDER BY started_at, run_id) AS seq FROM run_tests), regressions AS (SELECT b.run_name AS regressed_in, b.started_at AS regressed_at, b.suite AS suite, b.file AS file, b.title AS title, b.project AS project FROM ordered b JOIN ordered a ON a.suite = b.suite AND a.file = b.file AND a.title = b.title AND a.project = b.project AND b.seq = a.seq + 1 WHERE a.status = 'passed' AND b.status IN ('failed', 'timedOut', 'interrupted')), latest AS (SELECT run_id, run_name, started_at, status, suite, file, title, project, row_number() OVER (PARTITION BY suite, file, title, project ORDER BY started_at DESC, run_id DESC) AS rn FROM run_tests) SELECT r.suite, r.file, r.title, r.project, r.regressed_in, r.regressed_at, l.status AS last_status, l.started_at AS last_run_at FROM (SELECT r.*, row_number() OVER (PARTITION BY suite, file, title, project ORDER BY regressed_at DESC) AS rn FROM regressions r) r JOIN latest l ON l.suite = r.suite AND l.file = r.file AND l.title = r.title AND l.project = r.project AND l.rn = 1 WHERE r.rn = 1 ORDER BY l.started_at DESC`;
export const SLOW_SQL = `SELECT suite, file, title, project, round(avg(duration_ms), 1) AS avg_duration_ms, max(duration_ms) AS max_duration_ms, arg_max(duration_ms, started_at) AS last_duration_ms, max(started_at) AS last_run_at, arg_max(status, started_at) AS last_run_status, count(*) AS runs FROM ${SRC} GROUP BY suite, file, title, project ORDER BY avg(duration_ms) DESC LIMIT ?`;
export const TREND_SQL = `SELECT run_name, started_at, run_total, run_passed, run_failed, round(100.0 * (run_passed + coalesce(run_flaky, 0)) / nullif(run_total, 0), 1) AS pass_rate FROM ${SRC} GROUP BY run_id, run_name, started_at, run_total, run_passed, run_flaky, run_failed ORDER BY started_at`;
export const PROJECT_DURATIONS_SQL = `SELECT run_id, started_at, project, round(sum(duration_ms) / 1000.0, 2) AS duration_sec FROM ${SRC} WHERE project IS NOT NULL AND project != '' GROUP BY run_id, started_at, project ORDER BY started_at ASC`;
export const FILES_SQL = `SELECT run_id, started_at, file, count(*) AS total, count(*) FILTER (status = 'passed' AND coalesce(passed_on_retry, 0) = 0) AS passed, count(*) FILTER (status = 'passed' AND coalesce(passed_on_retry, 0) > 0) AS flaky, count(*) FILTER (status = 'failed') AS failed, count(*) FILTER (status = 'timedOut') AS timed_out, count(*) FILTER (status = 'interrupted') AS interrupted, count(*) FILTER (status = 'skipped') AS skipped FROM ${SRC} WHERE file IS NOT NULL AND file != '' GROUP BY run_id, started_at, file ORDER BY started_at ASC, file ASC`;
export const FILES_SUMMARY_SQL = `SELECT file, count(DISTINCT run_id) AS runs, count(*) AS total_tests, count(*) FILTER (status = 'passed' AND coalesce(passed_on_retry, 0) = 0) AS passed, count(*) FILTER (status = 'passed' AND coalesce(passed_on_retry, 0) > 0) AS flaky, count(*) FILTER (status = 'failed') AS failed, count(*) FILTER (status = 'timedOut') AS timed_out, count(*) FILTER (status = 'interrupted') AS interrupted, count(*) FILTER (status = 'skipped') AS skipped, round(100.0 * count(*) FILTER (status = 'passed') / nullif(count(*), 0), 1) AS pass_rate FROM ${SRC} WHERE file IS NOT NULL AND file != '' GROUP BY file ORDER BY total_tests DESC`;
export const TESTS_SQL = `SELECT run_id, started_at, suite, file, title, project, count(*) AS total, count(*) FILTER (status = 'passed' AND coalesce(passed_on_retry, 0) = 0) AS passed, count(*) FILTER (status = 'passed' AND coalesce(passed_on_retry, 0) > 0) AS flaky, count(*) FILTER (status = 'failed') AS failed, count(*) FILTER (status = 'timedOut') AS timed_out, count(*) FILTER (status = 'interrupted') AS interrupted, count(*) FILTER (status = 'skipped') AS skipped, round(avg(duration_ms), 1) AS avg_duration_ms FROM ${SRC} WHERE title IS NOT NULL AND title != '' GROUP BY run_id, started_at, suite, file, title, project ORDER BY started_at ASC, file ASC, title ASC`;
export const TESTS_SUMMARY_SQL = `SELECT suite, file, title, project, count(DISTINCT run_id) AS runs, count(*) AS total_executions, count(*) FILTER (status = 'passed' AND coalesce(passed_on_retry, 0) = 0) AS passed, count(*) FILTER (status = 'passed' AND coalesce(passed_on_retry, 0) > 0) AS flaky, count(*) FILTER (status = 'failed') AS failed, count(*) FILTER (status = 'timedOut') AS timed_out, count(*) FILTER (status = 'interrupted') AS interrupted, count(*) FILTER (status = 'skipped') AS skipped, round(avg(duration_ms), 1) AS avg_duration_ms, round(100.0 * count(*) FILTER (status = 'passed') / nullif(count(*), 0), 1) AS pass_rate FROM ${SRC} WHERE title IS NOT NULL AND title != '' GROUP BY suite, file, title, project ORDER BY total_executions DESC`;
