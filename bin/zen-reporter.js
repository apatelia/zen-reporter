#!/usr/bin/env node
import { execSync } from 'child_process';
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'fs';
import { resolve } from 'path';

function detectPackageManager(cwd = process.cwd()) {
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

const cwd = process.cwd();
const args = process.argv.slice(2);
const command = args[0] || 'show';

// ── `zr history` plumbing ────────────────────────────────────────────────

const historyDir = process.env.PW_REPORTER_OUTPUT || 'zen-report';
const runsDirPath = resolve(cwd, historyDir, 'runs');
const runsGlob = `${runsDirPath}/*.jsonl`;
// Canonical table expression: one row per test case per run, uniform schema.
const SRC = "read_json(?, format='newline_delimited')";

function findRunFiles() {
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

async function openDuckDb() {
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
 * Run a query and return object-keyed rows (one object per row, keyed by
 * column name) so both the table printer and history.json are uniform.
 */
async function runQuery(conn, sql, params) {
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

function formatDuration(ms) {
  if (ms === null || ms === undefined || isNaN(ms)) return '';
  const totalSeconds = Math.round(Number(ms) / 1000);
  if (totalSeconds < 60) {
    return `${totalSeconds}s`;
  }
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}m ${seconds}s`;
}

function toProperCase(str) {
  return str
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

function isNumericValue(val) {
  if (val === null || val === undefined) return false;
  if (typeof val === 'number') return true;
  if (typeof val === 'string' && val.trim() !== '') {
    // Check for numbers or formatted duration strings like "5s" or "1m 20s" or percentages "70.6%"
    if (!isNaN(Number(val))) return true;
    if (/^\d+s$/.test(val) || /^\d+m \d+s$/.test(val) || /^\d+(\.\d+)?%$/.test(val)) return true;
  }
  return false;
}

function formatDate(val) {
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

function printTable({ columns, rows }, emptyMessage = 'No records found.') {
  if (!columns || columns.length === 0) return;

  // Header mapping: Proper Case without 'ms'
  const displayHeaders = columns.map((c) => {
    let header = c;
    if (header.endsWith('_ms')) {
      header = header.slice(0, -3);
    } else {
      header = header.replace('_ms_', '_');
    }
    return toProperCase(header);
  });

  const formattedRows = rows.map((r) =>
    columns.map((c) => {
      const val = r && c in r ? r[c] : null;
      if (val === null || val === undefined) return '';
      if (c.includes('ms')) {
        return formatDuration(val);
      }
      if (c.endsWith('_at') || val instanceof Date) {
        return formatDate(val);
      }
      return val;
    })
  );

  let stringRows = formattedRows.map((row) =>
    row.map((cell) => {
      if (cell instanceof Date) return formatDate(cell);
      return String(cell);
    })
  );

  // Determine if column is predominantly numeric for right-alignment
  const isNumericColumn = columns.map((_, colIdx) => {
    return formattedRows.some((row) => isNumericValue(row[colIdx]));
  });

  const naturalWidths = displayHeaders.map((header, colIdx) =>
    Math.max(header.length, ...stringRows.map((row) => row[colIdx].length))
  );

  // Responsive column width calculation to prevent line-wrapping in terminals
  const termWidth =
    process.stdout.columns && process.stdout.columns > 20 ? process.stdout.columns : 0;
  let widths = [...naturalWidths];

  if (termWidth > 0) {
    // Total overhead = (|  ) per column + starting | = columns * 3 + 1
    const overhead = columns.length * 3 + 1;
    const availableWidth = termWidth - overhead;
    let totalNaturalWidth = naturalWidths.reduce((a, b) => a + b, 0);

    if (totalNaturalWidth > availableWidth && availableWidth > columns.length * 5) {
      const flexIndices = [];
      let fixedWidthSum = 0;

      columns.forEach((col, idx) => {
        const isFlex = !isNumericColumn[idx] && !col.endsWith('_at') && naturalWidths[idx] > 15;
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
          const minW = Math.max(displayHeaders[idx].length, 8);
          widths[idx] = Math.max(minW, share);
        });
      }
    }
  }

  // Split a cell string into up to 2 lines matching the column width.
  // If the string exceeds 2 * width, line 2 gets elided with '...'.
  const wrapCell2Lines = (cellStr, width) => {
    const s = String(cellStr).trim();
    if (s.length <= width) {
      return [s, ''];
    }

    // Try to find last space before width limit
    let splitIdx = s.lastIndexOf(' ', width);
    if (splitIdx <= Math.floor(width / 3)) {
      splitIdx = width; // fall back to hard cut if no suitable space
    }

    const line1 = s.slice(0, splitIdx).trimEnd();
    const remainder = s.slice(splitIdx).trimStart();

    if (remainder.length <= width) {
      return [line1, remainder];
    }

    const line2 = width > 3 ? `${remainder.slice(0, width - 3)}...` : remainder.slice(0, width);
    return [line1, line2];
  };

  const truncatedHeaders = displayHeaders.map((h, i) => {
    const [l1] = wrapCell2Lines(h, widths[i]);
    return l1;
  });

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
  console.log(formatRow(truncatedHeaders));
  console.log(border);

  if (stringRows.length === 0) {
    const totalInnerWidth = widths.reduce((sum, w) => sum + w + 3, 0) - 1;
    const msg =
      emptyMessage.length > totalInnerWidth - 2
        ? emptyMessage.slice(0, totalInnerWidth - 5) + '...'
        : emptyMessage;
    const padTotal = totalInnerWidth - msg.length;
    const padLeft = Math.floor(padTotal / 2);
    const padRight = padTotal - padLeft;
    console.log(`|${' '.repeat(padLeft)}${msg}${' '.repeat(padRight)}|`);
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
}

function printHelp() {
  console.log(`
Zen Reporter CLI

Usage:
  npx zr show                           Serve and view the HTML report
  npx zr history                        List historic runs
  npx zr history runs                   Same as above
  npx zr history flaky                  Tests that failed in some runs and passed in others
  npx zr history regressions            Tests that passed in one run, failed in the next (latest regression per test)
  npx zr history slow [--limit N]       Slowest tests across runs (default 10)
  npx zr history trend                  Per-run pass rate over time
  npx zr history report                 Generate history.json and inject into index.html (History tab)
  npx zr history query "<SQL>"          Arbitrary SQL; table "runs" = read_json of runs/*.jsonl
`);
}

const RUNS_SQL = `SELECT DISTINCT run_name, started_at, run_duration_ms, run_total, run_passed, run_failed, run_timed_out, run_skipped, run_interrupted FROM ${SRC} ORDER BY started_at DESC`;

const FLAKY_SQL = `SELECT suite, file, title, project, count(*) FILTER (status IN ('failed', 'timedOut')) AS failed_runs, count(*) FILTER (status = 'passed') AS passed_runs, sum(passed_on_retry) AS recovered_by_retry, count(*) AS total_runs FROM ${SRC} GROUP BY suite, file, title, project HAVING failed_runs > 0 AND passed_runs > 0 ORDER BY failed_runs DESC, passed_runs DESC`;

const REGRESSIONS_SQL = `WITH run_tests AS (SELECT run_id, run_name, suite, file, title, project, max(started_at) AS started_at, CASE WHEN count(*) FILTER (status = 'failed') > 0 THEN 'failed' WHEN count(*) FILTER (status = 'timedOut') > 0 THEN 'timedOut' WHEN count(*) FILTER (status = 'interrupted') > 0 THEN 'interrupted' WHEN count(*) FILTER (status = 'skipped') > 0 THEN 'skipped' ELSE 'passed' END AS status FROM ${SRC} GROUP BY run_id, run_name, suite, file, title, project), ordered AS (SELECT run_id, run_name, started_at, suite, file, title, project, status, row_number() OVER (PARTITION BY suite, file, title, project ORDER BY started_at, run_id) AS seq FROM run_tests), regressions AS (SELECT b.run_name AS regressed_in, b.started_at AS regressed_at, b.suite AS suite, b.file AS file, b.title AS title, b.project AS project FROM ordered b JOIN ordered a ON a.suite = b.suite AND a.file = b.file AND a.title = b.title AND a.project = b.project AND b.seq = a.seq + 1 WHERE a.status = 'passed' AND b.status IN ('failed', 'timedOut', 'interrupted')), latest AS (SELECT run_id, run_name, started_at, status, suite, file, title, project, row_number() OVER (PARTITION BY suite, file, title, project ORDER BY started_at DESC, run_id DESC) AS rn FROM run_tests) SELECT r.suite, r.file, r.title, r.project, r.regressed_in, r.regressed_at, l.status AS last_status, l.started_at AS last_run_at FROM (SELECT r.*, row_number() OVER (PARTITION BY suite, file, title, project ORDER BY regressed_at DESC) AS rn FROM regressions r) r JOIN latest l ON l.suite = r.suite AND l.file = r.file AND l.title = r.title AND l.project = r.project AND l.rn = 1 WHERE r.rn = 1 ORDER BY l.started_at DESC`;

const SLOW_SQL = `SELECT suite, file, title, project, round(avg(duration_ms), 1) AS avg_duration_ms, max(duration_ms) AS max_duration_ms, count(*) AS runs FROM ${SRC} GROUP BY suite, file, title, project ORDER BY avg(duration_ms) DESC LIMIT ?`;

const TREND_SQL = `SELECT run_name, started_at, run_total, run_passed, run_failed, round(100.0 * run_passed / nullif(run_total, 0), 1) AS pass_rate FROM ${SRC} GROUP BY run_id, run_name, started_at, run_total, run_passed, run_failed ORDER BY started_at`;

const PROJECT_DURATIONS_SQL = `SELECT run_id, started_at, project, round(sum(duration_ms) / 1000.0, 2) AS duration_sec FROM ${SRC} WHERE project IS NOT NULL AND project != '' GROUP BY run_id, started_at, project ORDER BY started_at ASC`;

async function generateHistoryReport(conn) {
  const runsSql = `SELECT DISTINCT run_id, run_name, started_at, run_duration_ms, coalesce(max(run_sequential_duration_ms), sum(duration_ms)) AS run_sequential_duration_ms, max(run_workers) AS run_workers, run_total, run_passed, run_failed, run_timed_out, run_skipped, run_interrupted, round(100.0 * run_passed / nullif(run_total, 0), 1) AS pass_rate FROM ${SRC} GROUP BY run_id, run_name, started_at, run_duration_ms, run_total, run_passed, run_failed, run_timed_out, run_skipped, run_interrupted ORDER BY started_at ASC`;

  const [runsResult, flakyResult, regressionsResult, slowResult, projectDurationsResult] =
    await Promise.all([
      runQuery(conn, runsSql, [runsGlob]),
      runQuery(conn, FLAKY_SQL, [runsGlob]),
      runQuery(conn, REGRESSIONS_SQL, [runsGlob]),
      runQuery(conn, SLOW_SQL, [runsGlob, 10]),
      runQuery(conn, PROJECT_DURATIONS_SQL, [runsGlob]),
    ]);

  const projectDurationsByRun = {};
  for (const row of projectDurationsResult.rows) {
    if (!projectDurationsByRun[row.run_id]) {
      projectDurationsByRun[row.run_id] = {};
    }
    projectDurationsByRun[row.run_id][row.project] = row.duration_sec;
  }

  const runs = runsResult.rows.map((run) => ({
    ...run,
    project_durations: projectDurationsByRun[run.run_id] || {},
  }));

  const history = {
    generated_at: new Date().toISOString(),
    runs,
    flaky: flakyResult.rows,
    regressions: regressionsResult.rows,
    slowest: slowResult.rows,
    project_trends: projectDurationsResult.rows,
  };

  const historyPath = resolve(cwd, historyDir, 'history.json');
  writeFileSync(historyPath, JSON.stringify(history, null, 2), 'utf8');

  const indexPath = resolve(cwd, historyDir, 'index.html');
  if (!existsSync(indexPath)) {
    console.error('! index.html not found — history.json written but not injected.');
    return;
  }

  const script = `<script id="history-data" type="application/json">${JSON.stringify(
    history
  ).replace(/</g, '\\u003c')}</script>`;
  let html = readFileSync(indexPath, 'utf8');
  html = html
    .replace(/<script id="history-data" type="application\/json">[\s\S]*?<\/script>/, '')
    .replace('</head>', `${script}\n</head>`);
  writeFileSync(indexPath, html, 'utf8');
  console.log(`✓ history.json written and injected into ${indexPath}`);
}

async function handleHistory(subArgs) {
  const sub = subArgs[0] || 'runs';
  const conn = await openDuckDb();
  findRunFiles();
  try {
    switch (sub) {
      case 'runs':
        printTable(await runQuery(conn, RUNS_SQL, [runsGlob]), 'No historic test runs found.');
        break;

      case 'flaky':
        printTable(await runQuery(conn, FLAKY_SQL, [runsGlob]), 'No flaky tests found.');
        break;

      case 'regressions':
        printTable(await runQuery(conn, REGRESSIONS_SQL, [runsGlob]), 'No test regressions found.');
        break;

      case 'slow': {
        const idx = subArgs.indexOf('--limit');
        const rawLimit =
          idx >= 0 ? subArgs[idx + 1] : /^\d+$/.test(subArgs[1] || '') ? subArgs[1] : '10';
        const limit = Math.max(1, parseInt(rawLimit, 10) || 10);
        printTable(await runQuery(conn, SLOW_SQL, [runsGlob, limit]), 'No slow tests found.');
        break;
      }

      case 'trend':
        printTable(await runQuery(conn, TREND_SQL, [runsGlob]), 'No trend data found.');
        break;

      case 'report':
        await generateHistoryReport(conn);
        break;

      case 'query': {
        const sqlText = subArgs.slice(1).join(' ').trim();
        if (!sqlText) {
          console.error('✗ Usage: zr history query "<SQL>"');
          process.exit(1);
        }
        const usesReadJson = sqlText.includes('read_json');
        const sql = usesReadJson
          ? sqlText
          : `WITH runs AS (SELECT * FROM read_json(?, format='newline_delimited')) ${sqlText}`;
        const params = usesReadJson ? [] : [runsGlob];
        try {
          printTable(await runQuery(conn, sql, params), 'No matching records found.');
        } catch (e) {
          console.error('✗ Query failed:', e?.message || e);
          process.exit(1);
        }
        break;
      }

      default:
        printHelp();
    }
  } finally {
    try {
      conn.closeSync();
    } catch {
      /* ignore */
    }
  }
}

// ── dispatcher ───────────────────────────────────────────────────────────

if (command === 'show') {
  const outputDir = process.env.PW_REPORTER_OUTPUT || 'zen-report';
  const reportPath = resolve(cwd, outputDir, 'index.html');

  if (!existsSync(reportPath)) {
    console.error(`✗ Report file not found at "${outputDir}/index.html".`);
    console.error(`  Make sure you have run your Playwright tests first.`);
    process.exit(1);
  }

  const pm = detectPackageManager(cwd);
  const showCmd =
    pm === 'pnpm'
      ? `pnpm exec playwright show-report ${outputDir}`
      : pm === 'yarn'
        ? `yarn exec playwright show-report ${outputDir}`
        : pm === 'bun'
          ? `bunx playwright show-report ${outputDir}`
          : `npx playwright show-report ${outputDir}`;

  try {
    execSync(showCmd, { cwd, stdio: 'inherit' });
  } catch (err) {
    if (
      err &&
      typeof err === 'object' &&
      'status' in err &&
      err.status !== 130 &&
      err.status !== 0
    ) {
      console.error('✗ Failed to launch report server:', err.message || err);
    }
  }
} else if (command === 'history') {
  handleHistory(args.slice(1)).catch((e) => {
    console.error('✗ history command failed:', e?.message || e);
    process.exit(1);
  });
} else {
  printHelp();
}
