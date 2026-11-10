import { createInterface } from 'readline';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';
import {
  checkDatabaseSizeWarning,
  exportTableToCsv,
  FILES_SUMMARY_SQL,
  findRunFiles,
  FLAKY_SQL,
  formatDate,
  openDuckDb,
  printPaginatedTable,
  printTable,
  PROJECT_DURATIONS_SQL,
  REGRESSIONS_SQL,
  runQuery,
  RUNS_SQL,
  setupHistorySource,
  SLOW_SQL,
  SRC,
  TESTS_SUMMARY_SQL,
  TREND_SQL,
} from './common.js';
import { generateExportFilename } from '@arpanp/zen-core';
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
  await setupHistorySource(conn, historyDir, cwd);

  const runsSql = `SELECT DISTINCT run_id, run_name, started_at, run_duration_ms, coalesce(max(run_sequential_duration_ms), sum(duration_ms)) AS run_sequential_duration_ms, max(run_workers) AS run_workers, count(DISTINCT file) AS run_files, run_total, run_passed, coalesce(max(run_flaky), 0) AS run_flaky, run_failed, run_timed_out, run_skipped, run_interrupted, round(100.0 * (run_passed + coalesce(max(run_flaky), 0)) / nullif(run_total, 0), 1) AS pass_rate, max(coalesce(step_assertions, 0)) AS step_assertions, max(coalesce(step_actions, 0)) AS step_actions, max(coalesce(step_network, 0)) AS step_network, max(coalesce(step_hooks, 0)) AS step_hooks, max(coalesce(step_waits, 0)) AS step_waits, max(coalesce(step_others, 0)) AS step_others, max(git_branch) AS git_branch, max(git_commit) AS git_commit, max(git_commit_full) AS git_commit_full FROM ${SRC} GROUP BY run_id, run_name, started_at, run_duration_ms, run_total, run_passed, run_failed, run_timed_out, run_skipped, run_interrupted ORDER BY started_at DESC LIMIT 50`;

  const windowedFilesSql = `
    WITH recent_runs AS (
      SELECT run_id, started_at
      FROM ${SRC}
      GROUP BY run_id, started_at
      ORDER BY started_at DESC
      LIMIT 50
    )
    SELECT
      t.run_id,
      t.started_at,
      t.file,
      count(*) AS total,
      count(*) FILTER (status = 'passed' AND coalesce(t.passed_on_retry, 0) = 0) AS passed,
      count(*) FILTER (status = 'passed' AND coalesce(t.passed_on_retry, 0) > 0) AS flaky,
      count(*) FILTER (status = 'failed') AS failed,
      count(*) FILTER (status = 'timedOut') AS timed_out,
      count(*) FILTER (status = 'interrupted') AS interrupted,
      count(*) FILTER (status = 'skipped') AS skipped
    FROM ${SRC} t
    JOIN recent_runs r ON t.run_id = r.run_id
    WHERE t.file IS NOT NULL AND t.file != ''
    GROUP BY t.run_id, t.started_at, t.file
    ORDER BY t.started_at ASC, t.file ASC
  `;

  const windowedTestsSql = `
    WITH recent_runs AS (
      SELECT run_id, started_at
      FROM ${SRC}
      GROUP BY run_id, started_at
      ORDER BY started_at DESC
      LIMIT 50
    )
    SELECT
      t.run_id,
      t.started_at,
      t.suite,
      t.file,
      t.title,
      t.project,
      count(*) AS total,
      count(*) FILTER (status = 'passed' AND coalesce(t.passed_on_retry, 0) = 0) AS passed,
      count(*) FILTER (status = 'passed' AND coalesce(t.passed_on_retry, 0) > 0) AS flaky,
      count(*) FILTER (status = 'failed') AS failed,
      count(*) FILTER (status = 'timedOut') AS timed_out,
      count(*) FILTER (status = 'interrupted') AS interrupted,
      count(*) FILTER (status = 'skipped') AS skipped,
      round(avg(duration_ms), 1) AS avg_duration_ms
    FROM ${SRC} t
    JOIN recent_runs r ON t.run_id = r.run_id
    WHERE t.title IS NOT NULL AND t.title != ''
    GROUP BY t.run_id, t.started_at, t.suite, t.file, t.title, t.project
    ORDER BY t.started_at ASC, t.file ASC, t.title ASC
  `;

  const [
    runsResult,
    flakyResult,
    regressionsResult,
    slowResult,
    projectDurationsResult,
    filesResult,
    testsResult,
  ] = await Promise.all([
    runQuery(conn, runsSql),
    runQuery(conn, FLAKY_SQL),
    runQuery(conn, REGRESSIONS_SQL),
    runQuery(conn, SLOW_SQL, [10]),
    runQuery(conn, PROJECT_DURATIONS_SQL),
    runQuery(conn, windowedFilesSql),
    runQuery(conn, windowedTestsSql),
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

  // Retain up to 50 runs ordered by started_at ASC for trends and history browsing
  const sortedRuns = runs.slice().reverse();
  const history = {
    generated_at: new Date().toISOString(),
    runs: sortedRuns,
    flaky: flakyResult.rows,
    regressions: regressionsResult.rows,
    slowest: slowResult.rows,
    files: filesResult.rows,
    tests: testsResult.rows,
    project_trends: projectDurationsResult.rows,
  };

  const historyPath = resolve(cwd, historyDir, 'history.json');
  writeFileSync(historyPath, JSON.stringify(history, null, 2), 'utf8');

  // Strip legacy embedded history script from index.html if present
  const indexPath = resolve(cwd, historyDir, 'index.html');
  if (existsSync(indexPath)) {
    let html = readFileSync(indexPath, 'utf8');
    if (html.includes('<script id="history-data"')) {
      html = html.replace(
        /<script id="history-data" type="application\/json">[\s\S]*?<\/script>/,
        ''
      );
      writeFileSync(indexPath, html, 'utf8');
    }
  }

  console.log(`✓ Execution history updated: ${historyPath}`);
}

/**
 * Prompts the user on the terminal for confirmation.
 *
 * @param {string} question - Question text to present to the user.
 * @returns {Promise<boolean>} True if user answers yes, false otherwise.
 */
function confirmAction(question) {
  return new Promise((res) => {
    const rl = createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    rl.question(question, (answer) => {
      rl.close();
      res(/^(y|yes)$/i.test(answer.trim()));
    });
  });
}

/**
 * Prompts the user on the terminal with arbitrary question text and returns the raw input string.
 *
 * @param {string} question - Question prompt text.
 * @returns {Promise<string>} Trimmed user response.
 */
function promptInput(question) {
  return new Promise((res) => {
    const rl = createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    rl.question(question, (answer) => {
      rl.close();
      res(answer.trim());
    });
  });
}

/**
 * Parses user-provided selection string containing indices and hyphenated ranges (e.g. "1", "1-3", "2, 5-7, 10").
 *
 * @param {string} input - User input string.
 * @param {number} max - Maximum allowed 1-based index.
 * @returns {number[]} Sorted unique list of 1-based indices, or empty array if invalid.
 */
export function parseRangeSelection(input, max) {
  if (!input || !input.trim()) return [];

  const trimmed = input.trim();
  if (trimmed.toLowerCase() === 'all') {
    return Array.from({ length: max }, (_, i) => i + 1);
  }

  const parts = trimmed
    .split(',')
    .map((p) => p.trim())
    .filter(Boolean);
  const selected = new Set();

  for (const part of parts) {
    if (part.includes('-')) {
      const rangeParts = part.split('-').map((p) => p.trim());
      if (rangeParts.length !== 2) return [];
      const start = parseInt(rangeParts[0], 10);
      const end = parseInt(rangeParts[1], 10);
      if (isNaN(start) || isNaN(end) || start < 1 || end < 1 || start > max || end > max) {
        return [];
      }
      const min = Math.min(start, end);
      const high = Math.max(start, end);
      for (let i = min; i <= high; i++) {
        selected.add(i);
      }
    } else {
      const num = parseInt(part, 10);
      if (isNaN(num) || num < 1 || num > max) {
        return [];
      }
      selected.add(num);
    }
  }

  return Array.from(selected).sort((a, b) => a - b);
}

/**
 * Handles all `zr history` subcommands (runs, flaky, regressions, slow, trend, files, tests, report, query, clean).
 *
 * @param {string[]} subArgs - Command line sub-arguments passed to history.
 * @param {string} [cwd=process.cwd()] - Current working directory.
 * @returns {Promise<void>}
 */
export async function handleHistory(subArgs, cwd = process.cwd()) {
  const historyDir = process.env.PW_REPORTER_OUTPUT || 'zen-report';
  const runsDirPath = resolve(cwd, historyDir, 'runs');
  const sub = subArgs[0] || 'runs';

  if (sub === 'clean') {
    const dbPath = resolve(cwd, historyDir, 'history.db');
    if (!existsSync(dbPath)) {
      throw new Error(
        `SQLite history database not found at "${historyDir}/history.db". Clean is supported for local SQLite engine only.`
      );
    }

    const isAll = subArgs.includes('--all');
    const isDryRun = subArgs.includes('--dry-run');
    const isYes = subArgs.includes('--yes') || subArgs.includes('-y');
    const isVacuumExplicit = subArgs.includes('--vacuum');
    const isNoVacuum = subArgs.includes('--no-vacuum');
    const vacuumOption = isVacuumExplicit ? true : isNoVacuum ? false : undefined;

    const recentIdx = subArgs.indexOf('--recent');
    const keepIdx = subArgs.indexOf('--keep');
    const runIdIdx = subArgs.indexOf('--run-id');
    const runNameIdx = subArgs.indexOf('--run-name');

    let recent = recentIdx >= 0 ? parseInt(subArgs[recentIdx + 1], 10) : undefined;
    let keep = keepIdx >= 0 ? parseInt(subArgs[keepIdx + 1], 10) : undefined;
    let runId = runIdIdx >= 0 ? subArgs[runIdIdx + 1] : undefined;
    let runName = runNameIdx >= 0 ? subArgs[runNameIdx + 1] : undefined;
    let selectedRunIds = undefined;
    let selectedSrNumbers = undefined;
    const srMap = {};
    const runDetailMap = new Map();

    if (recent !== undefined && (isNaN(recent) || recent <= 0)) {
      throw new Error('Invalid value for --recent: must be a positive integer.');
    }
    if (keep !== undefined && (isNaN(keep) || keep < 0)) {
      throw new Error('Invalid value for --keep: must be a non-negative integer.');
    }
    if (runId !== undefined && !runId.trim()) {
      throw new Error('Invalid value for --run-id: run ID cannot be empty.');
    }
    if (runName !== undefined && !runName.trim()) {
      throw new Error('Invalid value for --run-name: run name cannot be empty.');
    }

    const { SqliteHistoryStore } = await import('../../dist/reporter.js');
    const store = new SqliteHistoryStore({
      dbPath,
      autoMigrate: false,
    });

    try {
      // If no target options provided, launch interactive selection
      const hasExplicitTarget =
        isAll || recent !== undefined || keep !== undefined || runId || runName;
      if (!hasExplicitTarget) {
        if (!process.stdin.isTTY) {
          throw new Error(
            'Usage: zr history clean [--all] [--recent <N>] [--keep <N>] [--run-id <ID>] [--run-name <NAME>] [--dry-run] [-y|--yes]'
          );
        }

        const availableRuns = await store.listRuns();
        if (availableRuns.length === 0) {
          console.log('ℹ No historic runs found to clean.');
          return;
        }

        console.log('\nSelect runs to delete:\n');
        const columns = [
          'run_name',
          'started_at',
          'git_branch',
          'run_files',
          'run_total',
          'pass_rate',
        ];
        const rows = availableRuns.map((r) => ({
          run_name: r.run_name || r.run_id,
          started_at: r.started_at,
          git_branch: r.git_branch || '—',
          run_files: r.run_files ?? 0,
          run_total: r.run_total ?? 0,
          pass_rate: r.pass_rate !== null && r.pass_rate !== undefined ? `${r.pass_rate}%` : '—',
        }));

        availableRuns.forEach((r) => runDetailMap.set(r.run_id, r));

        const pageSize = 20;
        let selectedIndices = [];
        let currentOffset = 0;

        if (availableRuns.length <= pageSize) {
          printTable({ columns, rows }, 'No runs found.', 'runs');
          const selection = await promptInput(
            `\nEnter Sr. No.(s) to delete (e.g. "1", "1-3", "2, 5-8, 12", "all") or 'q' to cancel: `
          );

          if (!selection || selection.toLowerCase() === 'q') {
            console.log('Action canceled.');
            return;
          }

          selectedIndices = parseRangeSelection(selection, availableRuns.length);
          if (selectedIndices.length === 0) {
            console.error(
              `✗ Invalid selection: "${selection}". Expected comma-separated numbers or ranges between 1 and ${availableRuns.length}.`
            );
            process.exitCode = 1;
            return;
          }
        } else {
          // Paged interactive selection loop
          let selectionMade = false;

          while (!selectionMade) {
            const pageRows = rows.slice(currentOffset, currentOffset + pageSize);
            printTable({ columns, rows: pageRows }, 'No runs found.', 'runs', {
              offset: currentOffset,
              totalCount: availableRuns.length,
            });

            const currentEnd = currentOffset + pageRows.length;
            const remaining = availableRuns.length - currentEnd;
            const hasNext = remaining > 0;
            const hasPrev = currentOffset > 0;

            const navHints = [];
            if (hasNext) navHints.push("'n' (next page)");
            if (hasPrev) navHints.push("'p' (previous page)");
            navHints.push("'a' (show all)");
            navHints.push("'q' (cancel)");

            const promptMsg = `\nEnter Sr. No.(s) to delete (e.g. "1", "1-3", "2, 5-8", "all") or ${navHints.join(', ')}: `;
            const input = await promptInput(promptMsg);
            const trimmed = input.trim().toLowerCase();

            if (!trimmed || trimmed === 'q') {
              console.log('Action canceled.');
              return;
            }

            if (trimmed === 'n') {
              if (hasNext) {
                currentOffset += pageSize;
              } else {
                console.log('Already on the last page.');
              }
              continue;
            }

            if (trimmed === 'p') {
              if (hasPrev) {
                currentOffset = Math.max(0, currentOffset - pageSize);
              } else {
                console.log('Already on the first page.');
              }
              continue;
            }

            if (trimmed === 'a') {
              printTable({ columns, rows }, 'No runs found.', 'runs');
              const sel = await promptInput(
                `\nEnter Sr. No.(s) to delete (e.g. "1", "1-3", "2, 5-8", "all") or 'q' to cancel: `
              );
              if (!sel || sel.toLowerCase() === 'q') {
                console.log('Action canceled.');
                return;
              }
              selectedIndices = parseRangeSelection(sel, availableRuns.length);
              if (selectedIndices.length === 0) {
                console.error(
                  `✗ Invalid selection: "${sel}". Expected numbers or ranges between 1 and ${availableRuns.length}.`
                );
                process.exitCode = 1;
                return;
              }
              selectionMade = true;
              break;
            }

            selectedIndices = parseRangeSelection(input, availableRuns.length);
            if (selectedIndices.length === 0) {
              console.error(
                `✗ Invalid selection: "${input}". Expected comma-separated numbers, ranges between 1 and ${availableRuns.length}, or navigation keys (n/p/a/q).\n`
              );
              continue;
            }

            selectionMade = true;
          }
        }

        selectedIndices.forEach((idx) => {
          srMap[availableRuns[idx - 1].run_id] = idx;
        });
        selectedRunIds = selectedIndices.map((idx) => availableRuns[idx - 1].run_id);
        selectedSrNumbers = selectedIndices;
      }

      // First preview target runs with dry run
      let preview;
      try {
        preview = await store.cleanHistory({
          all: isAll,
          recent,
          keep,
          runId,
          runIds: selectedRunIds,
          runName,
          dryRun: true,
          outputDir: resolve(cwd, historyDir),
        });
      } catch (err) {
        if (err?.conflictingRuns && err.conflictingRuns.length > 1) {
          console.error(
            `\n✗ Found ${err.conflictingRuns.length} runs with the name "${runName}". Ambiguous target:\n`
          );
          const columns = [
            'run_name',
            'started_at',
            'git_branch',
            'run_files',
            'run_total',
            'pass_rate',
          ];
          const rows = err.conflictingRuns.map((r) => ({
            run_name: r.run_name || r.run_id,
            started_at: r.started_at,
            git_branch: r.git_branch || '—',
            run_files: r.run_files ?? 0,
            run_total: r.run_total ?? 0,
            pass_rate: r.pass_rate !== null && r.pass_rate !== undefined ? `${r.pass_rate}%` : '—',
          }));
          printTable({ columns, rows }, 'No runs found.', 'conflicting runs');

          if (!process.stdin.isTTY) {
            console.error(
              `\nPlease specify the unique run ID using: npx zr history clean --run-id <ID>\n`
            );
            process.exitCode = 1;
            return;
          }

          // Interactive number selection
          const selection = await promptInput(
            `\nEnter Sr. No.(s) to delete (e.g. "1", "1-3", "2, 4-6", "all") or 'q' to cancel: `
          );

          if (!selection || selection.toLowerCase() === 'q') {
            console.log('Action canceled.');
            return;
          }

          err.conflictingRuns.forEach((r) => runDetailMap.set(r.run_id, r));

          const selectedIndices = parseRangeSelection(selection, err.conflictingRuns.length);
          if (selectedIndices.length === 0) {
            console.error(
              `✗ Invalid selection: "${selection}". Expected comma-separated numbers or ranges between 1 and ${err.conflictingRuns.length}.`
            );
            process.exitCode = 1;
            return;
          }

          selectedIndices.forEach((idx) => {
            srMap[err.conflictingRuns[idx - 1].run_id] = idx;
          });
          selectedRunIds = selectedIndices.map((idx) => err.conflictingRuns[idx - 1].run_id);
          selectedSrNumbers = selectedIndices;
          runName = undefined;

          // Now re-run preview for the selected run IDs
          preview = await store.cleanHistory({
            runIds: selectedRunIds,
            dryRun: true,
            outputDir: resolve(cwd, historyDir),
          });
        } else {
          throw err;
        }
      }

      if (preview.deletedRunIds.length === 0) {
        console.log('ℹ No matching runs found to clean.');
        return;
      }

      if (preview.deletedRunIds.length > 0) {
        const missingIds = preview.deletedRunIds.filter((id) => !runDetailMap.has(id));
        if (missingIds.length > 0) {
          try {
            const placeholders = missingIds.map(() => '?').join(',');
            const rows = store.db
              .prepare(
                `SELECT run_id, run_name, started_at FROM history_runs WHERE run_id IN (${placeholders})`
              )
              .all(...missingIds);
            rows.forEach((r) => runDetailMap.set(r.run_id, r));
          } catch {
            /* ignore lookup errors */
          }
        }
      }

      console.log(
        `\nTargeted ${preview.deletedRunIds.length} run(s) (${preview.deletedTestCases} test executions, ${preview.deletedAttachments} attachment file(s)):`
      );
      for (const id of preview.deletedRunIds) {
        const srPrefix = srMap[id] ? `[#${srMap[id]}] ` : '';
        const runDetail = runDetailMap.get(id);
        const nameStr = runDetail?.run_name ? `"${runDetail.run_name}" ` : '';
        const startedAtStr = runDetail?.started_at
          ? `(started: ${formatDate(runDetail.started_at)}) `
          : '';
        console.log(`  - ${srPrefix}${nameStr}${startedAtStr}[ID: ${id}]`);
      }

      if (isDryRun) {
        console.log('\n[Dry Run] No data or files were deleted.');
        return;
      }

      if (!isYes) {
        const srDesc =
          selectedSrNumbers && selectedSrNumbers.length > 0
            ? `Sr. No.(s) [${selectedSrNumbers.join(', ')}] (${preview.deletedRunIds.length} runs)`
            : `these ${preview.deletedRunIds.length} run(s)`;
        const confirmed = await confirmAction(
          `\nAre you sure you want to delete ${srDesc} and their attachments? [y/N]: `
        );
        if (!confirmed) {
          console.log('Action canceled.');
          return;
        }
      }

      const result = await store.cleanHistory({
        all: isAll,
        recent,
        keep,
        runId,
        runIds: selectedRunIds,
        runName,
        dryRun: false,
        outputDir: resolve(cwd, historyDir),
        vacuum: vacuumOption,
      });

      const vacuumNote = result.vacuumed ? ' Database repacked with VACUUM.' : '';
      console.log(
        `✓ Successfully deleted ${result.deletedRunIds.length} run(s), ${result.deletedTestCases} test execution(s), and ${result.deletedAttachments} attachment file(s).${vacuumNote}`
      );

      // Refresh history.json if it exists so static reports don't have stale deleted runs
      const historyJsonPath = resolve(cwd, historyDir, 'history.json');
      if (existsSync(historyJsonPath)) {
        try {
          const freshHistory = await store.getHistoryData();
          writeFileSync(historyJsonPath, JSON.stringify(freshHistory, null, 2), 'utf8');
          console.log(`✓ Synchronized ${historyDir}/history.json with updated SQLite database.`);
        } catch {
          /* ignore report sync errors */
        }
      }

      // Check if the currently displayed run in index.html was deleted and auto-regenerate
      const reportDirPath = resolve(cwd, historyDir);
      const indexPath = resolve(reportDirPath, 'index.html');
      if (existsSync(indexPath)) {
        try {
          const indexHtmlContent = readFileSync(indexPath, 'utf8');
          const dataMatch = indexHtmlContent.match(
            /<script id="report-data" type="application\/json">([\s\S]*?)<\/script>/
          );
          let wasActiveRunDeleted = isAll;
          if (!wasActiveRunDeleted && dataMatch && dataMatch[1]) {
            try {
              const parsed = JSON.parse(dataMatch[1]);
              const embeddedName = parsed?.testRun?.testRunName;
              const embeddedTime = parsed?.testRun?.summary?.startTime;

              // Check if any deleted run ID matches the embedded run's start time and slugified name
              if (embeddedTime && embeddedName) {
                const slug = embeddedName
                  .toLowerCase()
                  .trim()
                  .replace(/[^a-z0-9]+/g, '-')
                  .replace(/^-+|-+$/g, '');
                const expectedPrefix = `${embeddedTime.replace(/[:.]/g, '-')}__${slug}`;
                wasActiveRunDeleted = result.deletedRunIds.some(
                  (id) => id === expectedPrefix || id.startsWith(`${expectedPrefix}__shard`)
                );
              }
            } catch {
              /* ignore parse error */
            }
          }

          if (wasActiveRunDeleted) {
            const remainingRuns = await store.listRuns(1);
            if (remainingRuns.length > 0) {
              const newLatestRunId = remainingRuns[0].run_id;
              const newReportData = await store.getRunReport(newLatestRunId);
              if (newReportData) {
                const { updateReportHtmlFiles } = await import('../../dist/reporter.js');
                const updated = updateReportHtmlFiles(reportDirPath, newReportData);
                if (updated) {
                  console.log(
                    `✓ Updated ${historyDir}/index.html to display latest remaining run "${newReportData.testRun.testRunName}".`
                  );
                }
              }
            } else {
              console.log(
                `ℹ All historical runs removed. Next test execution will generate a fresh report.`
              );
            }
          }
        } catch {
          /* ignore html sync errors */
        }
      }
    } finally {
      await store.close();
    }

    return;
  }

  findRunFiles(runsDirPath, historyDir);
  checkDatabaseSizeWarning(historyDir, cwd);

  const conn = await openDuckDb();
  await setupHistorySource(conn, historyDir, cwd);

  const isAllFlag = subArgs.includes('--all');
  const limitArgIdx = subArgs.indexOf('--limit');
  const explicitLimit = limitArgIdx >= 0 ? parseInt(subArgs[limitArgIdx + 1], 10) : undefined;
  const isInteractiveSession =
    subArgs.includes('--interactive') ||
    Boolean(
      process.stdin.isTTY && process.stdout.isTTY && !isAllFlag && explicitLimit === undefined
    );

  // Parse export flag: --export [optionalPath] or -e [optionalPath]
  let isExport = false;
  let exportTargetPath;
  const exportIdx = subArgs.findIndex((a) => a === '--export' || a === '-e');
  if (exportIdx >= 0) {
    isExport = true;
    const nextArg = subArgs[exportIdx + 1];
    if (nextArg && !nextArg.startsWith('-')) {
      exportTargetPath = nextArg;
    }
  }

  /**
   * Helper to handle table display and optional CSV export.
   *
   * @param {object} table - Object containing columns and rows.
   * @param {string} emptyMessage - Empty table fallback message.
   * @param {string} entityName - Entity name for count/filenames.
   * @param {object} [opts] - Pagination options.
   * @returns {Promise<void>}
   */
  const handleDataset = async (table, emptyMessage, entityName, opts = {}) => {
    let rowsToExport = table.rows || [];
    if (!isAllFlag && opts.limit !== undefined) {
      rowsToExport = rowsToExport.slice(0, opts.limit);
    }

    if (isExport) {
      const defaultFilename = generateExportFilename(entityName.replace(/\s+/g, '-'));
      exportTableToCsv(
        { columns: table.columns, rows: rowsToExport },
        defaultFilename,
        exportTargetPath,
        historyDir,
        cwd
      );
    }

    await printPaginatedTable(table, emptyMessage, entityName, opts);
  };

  try {
    switch (sub) {
      case 'runs':
        await handleDataset(
          await runQuery(conn, RUNS_SQL),
          'No historic test runs found.',
          'runs',
          {
            all: isAllFlag,
            limit: explicitLimit,
            interactive: isInteractiveSession && !isExport,
          }
        );
        break;

      case 'flaky':
        await handleDataset(
          await runQuery(conn, FLAKY_SQL),
          'No flaky tests found.',
          'flaky tests',
          {
            all: isAllFlag,
            limit: explicitLimit,
            interactive: isInteractiveSession && !isExport,
          }
        );
        break;

      case 'regressions':
        await handleDataset(
          await runQuery(conn, REGRESSIONS_SQL),
          'No test regressions found.',
          'regressions',
          { all: isAllFlag, limit: explicitLimit, interactive: isInteractiveSession && !isExport }
        );
        break;

      case 'slow': {
        const rawLimit =
          limitArgIdx >= 0
            ? subArgs[limitArgIdx + 1]
            : /^\d+$/.test(subArgs[1] || '')
              ? subArgs[1]
              : '10';
        const limit = Math.max(1, parseInt(rawLimit, 10) || 10);
        const table = await runQuery(conn, SLOW_SQL, [limit]);
        if (isExport) {
          const defaultFilename = generateExportFilename('slow-tests');
          exportTableToCsv(table, defaultFilename, exportTargetPath, historyDir, cwd);
        }
        printTable(table, 'No slow tests found.', 'slow tests');
        break;
      }

      case 'trend':
        await handleDataset(await runQuery(conn, TREND_SQL), 'No trend data found.', 'trend', {
          all: isAllFlag,
          limit: explicitLimit,
          interactive: isInteractiveSession && !isExport,
        });
        break;

      case 'files':
        await handleDataset(
          await runQuery(conn, FILES_SUMMARY_SQL),
          'No spec files history found.',
          'spec files',
          { all: isAllFlag, limit: explicitLimit, interactive: isInteractiveSession && !isExport }
        );
        break;

      case 'tests':
        await handleDataset(
          await runQuery(conn, TESTS_SUMMARY_SQL),
          'No test history found.',
          'tests',
          { all: isAllFlag, limit: explicitLimit, interactive: isInteractiveSession && !isExport }
        );
        break;

      case 'report':
        await generateHistoryReport(conn, historyDir, cwd);
        break;

      case 'query': {
        const queryArgs = subArgs.slice(1).filter((a, idx, arr) => {
          if (a === '--export' || a === '-e') return false;
          const prev = arr[idx - 1];
          if ((prev === '--export' || prev === '-e') && !a.startsWith('-')) return false;
          return true;
        });
        const sqlText = queryArgs.join(' ').trim();
        if (!sqlText) {
          throw new Error('Usage: zr history query "<SQL>"');
        }
        const usesFrom = /\bfrom\b/i.test(sqlText);
        const sql = usesFrom ? sqlText : `SELECT * FROM ${SRC} ${sqlText}`;
        try {
          const result = await runQuery(conn, sql);
          if (isExport) {
            const defaultFilename = generateExportFilename('query-results');
            exportTableToCsv(result, defaultFilename, exportTargetPath, historyDir, cwd);
          }
          printTable(result, 'No matching records found.', 'records');
        } catch (e) {
          throw new Error(`Query failed: ${e?.message || e}`, { cause: e });
        }
        break;
      }

      case 'vacuum': {
        const dbPath = resolve(cwd, historyDir, 'history.db');
        if (!existsSync(dbPath)) {
          throw new Error(
            `SQLite history database not found at "${historyDir}/history.db". Vacuum is supported for local SQLite engine only.`
          );
        }
        const { SqliteHistoryStore } = await import('../../dist/reporter.js');
        const store = new SqliteHistoryStore({
          dbPath,
          autoMigrate: false,
        });
        try {
          console.log(`Repacking ${historyDir}/history.db using VACUUM to reclaim free space...`);
          await store.vacuum();
          console.log(`✓ Database successfully repacked and optimized.`);
        } finally {
          await store.close();
        }
        break;
      }

      case 'migrate': {
        const clean = subArgs.includes('--clean');
        const dbPath = resolve(cwd, historyDir, 'history.db');
        const { migrateJsonlToSqlite } = await import('../../dist/reporter.js');
        console.log(`Migrating historical JSONL runs to SQLite (${historyDir}/history.db)...`);
        const result = await migrateJsonlToSqlite({
          runsDir: runsDirPath,
          dbPath,
          deleteSourceFiles: clean,
        });
        console.log(
          `✓ Migrated ${result.migratedRuns} runs (${result.migratedTestCases} test executions) in ${result.durationMs}ms. Skipped ${result.skippedRuns} already migrated runs.`
        );
        if (clean) {
          if (result.totalFiles > 0) {
            console.log(`✓ Cleaned up source JSONL files.`);
          } else {
            console.log(`ℹ No legacy JSONL files found to clean up.`);
          }
        }
        break;
      }

      default:
        printHelp();
    }
  } finally {
    if (conn) {
      try {
        conn.closeSync();
      } catch {
        /* ignore cleanup error on exit */
      }
    }
  }
}
