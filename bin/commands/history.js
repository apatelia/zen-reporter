import { existsSync, readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';
import {
  FILES_SQL,
  FILES_SUMMARY_SQL,
  findRunFiles,
  FLAKY_SQL,
  openDuckDb,
  printTable,
  PROJECT_DURATIONS_SQL,
  REGRESSIONS_SQL,
  runQuery,
  RUNS_SQL,
  SLOW_SQL,
  SRC,
  TESTS_SQL,
  TESTS_SUMMARY_SQL,
  TREND_SQL,
} from './common.js';
import { printHelp } from './help.js';

/**
 * Generates `history.json` aggregate metrics from DuckDB queries and injects data into `index.html`.
 *
 * @param {object} conn - Active DuckDB connection.
 * @param {string} historyDir - Output report directory path.
 * @param {string} [cwd=process.cwd()] - Current working directory.
 * @returns {Promise<void>}
 */
export async function generateHistoryReport(conn, historyDir, cwd = process.cwd()) {
  const runsGlob = `${resolve(cwd, historyDir, 'runs')}/*.jsonl`;
  const runsSql = `SELECT DISTINCT run_id, run_name, started_at, run_duration_ms, coalesce(max(run_sequential_duration_ms), sum(duration_ms)) AS run_sequential_duration_ms, max(run_workers) AS run_workers, run_total, run_passed, run_failed, run_timed_out, run_skipped, run_interrupted, round(100.0 * run_passed / nullif(run_total, 0), 1) AS pass_rate, max(coalesce(step_assertions, 0)) AS step_assertions, max(coalesce(step_actions, 0)) AS step_actions, max(coalesce(step_network, 0)) AS step_network, max(coalesce(step_hooks, 0)) AS step_hooks, max(coalesce(step_waits, 0)) AS step_waits, max(coalesce(step_others, 0)) AS step_others FROM ${SRC} GROUP BY run_id, run_name, started_at, run_duration_ms, run_total, run_passed, run_failed, run_timed_out, run_skipped, run_interrupted ORDER BY started_at ASC`;

  const [
    runsResult,
    flakyResult,
    regressionsResult,
    slowResult,
    projectDurationsResult,
    filesResult,
    testsResult,
  ] = await Promise.all([
    runQuery(conn, runsSql, [runsGlob]),
    runQuery(conn, FLAKY_SQL, [runsGlob]),
    runQuery(conn, REGRESSIONS_SQL, [runsGlob]),
    runQuery(conn, SLOW_SQL, [runsGlob, 10]),
    runQuery(conn, PROJECT_DURATIONS_SQL, [runsGlob]),
    runQuery(conn, FILES_SQL, [runsGlob]),
    runQuery(conn, TESTS_SQL, [runsGlob]),
  ]);

  const projectDurationsByRun = {};

  for (const row of projectDurationsResult.rows) {
    if (!projectDurationsByRun[row.run_id]) {
      projectDurationsByRun[row.run_id] = {};
    }

    projectDurationsByRun[row.run_id][row.project] = row.duration_sec;
  }

  const runs = runsResult.rows.map((run) => {
    const {
      step_assertions,
      step_actions,
      step_network,
      step_hooks,
      step_waits,
      step_others,
      ...rest
    } = run;

    const hasStepCategories =
      (step_assertions || 0) +
        (step_actions || 0) +
        (step_network || 0) +
        (step_hooks || 0) +
        (step_waits || 0) +
        (step_others || 0) >
      0;

    return {
      ...rest,
      project_durations: projectDurationsByRun[run.run_id] || {},
      step_categories: hasStepCategories
        ? {
            assertions: step_assertions || 0,
            actions: step_actions || 0,
            network: step_network || 0,
            hooks: step_hooks || 0,
            waits: step_waits || 0,
            others: step_others || 0,
          }
        : undefined,
    };
  });

  const history = {
    generated_at: new Date().toISOString(),
    runs,
    flaky: flakyResult.rows,
    regressions: regressionsResult.rows,
    slowest: slowResult.rows,
    files: filesResult.rows,
    tests: testsResult.rows,
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
  console.log(`✓ Execution history updated.`);
}

/**
 * Handles all `zr history` subcommands (runs, flaky, regressions, slow, trend, files, tests, report, query).
 *
 * @param {string[]} subArgs - Command line sub-arguments passed to history.
 * @param {string} [cwd=process.cwd()] - Current working directory.
 * @returns {Promise<void>}
 */
export async function handleHistory(subArgs, cwd = process.cwd()) {
  const historyDir = process.env.PW_REPORTER_OUTPUT || 'zen-report';
  const runsDirPath = resolve(cwd, historyDir, 'runs');
  const runsGlob = `${runsDirPath}/*.jsonl`;
  const sub = subArgs[0] || 'runs';
  const conn = await openDuckDb();

  findRunFiles(runsDirPath, historyDir);

  try {
    switch (sub) {
      case 'runs':
        printTable(
          await runQuery(conn, RUNS_SQL, [runsGlob]),
          'No historic test runs found.',
          'runs'
        );
        break;

      case 'flaky':
        printTable(
          await runQuery(conn, FLAKY_SQL, [runsGlob]),
          'No flaky tests found.',
          'flaky tests'
        );
        break;

      case 'regressions':
        printTable(
          await runQuery(conn, REGRESSIONS_SQL, [runsGlob]),
          'No test regressions found.',
          'regressions'
        );
        break;

      case 'slow': {
        const idx = subArgs.indexOf('--limit');
        const rawLimit =
          idx >= 0 ? subArgs[idx + 1] : /^\d+$/.test(subArgs[1] || '') ? subArgs[1] : '10';
        const limit = Math.max(1, parseInt(rawLimit, 10) || 10);
        printTable(
          await runQuery(conn, SLOW_SQL, [runsGlob, limit]),
          'No slow tests found.',
          'slow tests'
        );
        break;
      }

      case 'trend':
        printTable(await runQuery(conn, TREND_SQL, [runsGlob]), 'No trend data found.', 'runs');
        break;

      case 'files':
        printTable(
          await runQuery(conn, FILES_SUMMARY_SQL, [runsGlob]),
          'No spec files history found.',
          'spec files'
        );
        break;

      case 'tests':
        printTable(
          await runQuery(conn, TESTS_SUMMARY_SQL, [runsGlob]),
          'No test history found.',
          'tests'
        );
        break;

      case 'report':
        await generateHistoryReport(conn, historyDir, cwd);
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
          printTable(await runQuery(conn, sql, params), 'No matching records found.', 'records');
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
