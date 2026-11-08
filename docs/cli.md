# Zen Reporter CLI Reference (`zr`)

Zen Reporter provides a built-in command-line interface executable (`npx zr` or `npx zen-reporter`) for previewing test reports, diagnosing runtime environments, performing cross-run test intelligence analytics, and managing the local SQLite historical database.

---

## Execution Modes

### 1. Interactive Menu Mode (TTY)

When executed without arguments in an interactive terminal session (`process.stdin.isTTY` and `process.stdout.isTTY`), `npx zr` launches a guided wizard powered by `@clack/prompts`:

```bash
npx zr
```

- **Interactive Selection**: Navigate commands, subcommands, and options using your arrow keys and press `Enter` to select.
- **Escape Key Handling**: Press `Esc` at any sub-prompt or confirmation dialog to step back to the previous menu level or safely cancel the operation.
- **Integrated Pagination**: Commands producing tabular output support interactive paging (`Next 25`, `Show All Remaining`, `Export All to CSV`, `Finish & Back`).

### 2. Direct Command Execution (Non-Interactive / CI Pipelines)

When run with specific command-line arguments or in non-TTY environments (such as CI/CD runners, GitHub Actions, or pipes):

- Prompts are automatically bypassed.
- Defaults to standard non-interactive limits (e.g. top 25 records).
- Exits cleanly with standard exit codes (`0` on success, `1` on error).

---

## Core Commands

### Report & Environment

| Command          | Description                                                                                                 |
| :--------------- | :---------------------------------------------------------------------------------------------------------- |
| `npx zr show`    | Launch the local HTTP report server (127.0.0.1) and open `index.html` in your default browser.              |
| `npx zr summary` | Generate a concise Markdown summary snippet of the latest test run (ideal for CI PR comments or job steps). |
| `npx zr env`     | Print diagnostic system information (Node.js, OS, `@playwright/test`, and `zen-reporter` versions).         |
| `npx zr help`    | Print standard CLI help and subcommand descriptions.                                                        |

---

## History & Intelligence (`zr history`)

> **Note**: History commands query SQLite (`history.db`) and historical JSONL logs using embedded DuckDB. Ensure `@duckdb/node-api` is installed in your project:
>
> ```bash
> npm i -D @duckdb/node-api
> ```

### Subcommands

| Command                           | Description                                                                               |
| :-------------------------------- | :---------------------------------------------------------------------------------------- |
| `npx zr history`                  | List historical test runs with start time, duration, tests count, and pass/fail metrics.  |
| `npx zr history runs`             | Alias for `npx zr history`.                                                               |
| `npx zr history files`            | Group and summarize historical execution metrics by spec file.                            |
| `npx zr history tests`            | Aggregate granular execution counts, pass rates, and average durations per test case.     |
| `npx zr history flaky`            | Identify flaky tests that failed in some runs and passed in others or recovered on retry. |
| `npx zr history regressions`      | List tests that passed in a previous run but failed or timed out in the latest run.       |
| `npx zr history slow [--limit N]` | Rank slowest test cases across runs by average duration (default limit: 10).              |
| `npx zr history trend`            | Display historical pass rate percentages per run over time.                               |
| `npx zr history report`           | Build or update `history.json` for report dashboard inspection without running tests.     |
| `npx zr history query "<SQL>"`    | Execute arbitrary SQL queries over recorded test runs.                                    |

### Global Table & Display Options

All table-producing history commands (`runs`, `files`, `tests`, `flaky`, `regressions`, `slow`, `trend`, `query`) support standard display flags:

- **`--all`**: Display or export all records, bypassing the default 25-record pagination window.
- **`--limit <N>`**: Limit output or export to the top `N` records (e.g. `--limit 10`).
- **`-e, --export [filename]`**: Export query results directly to an RFC 4180 compliant CSV file.
- **`--interactive`**: Force interactive pagination mode even when redirected or run with arguments.

---

## CSV Dataset Export (`--export` / `-e`)

Any history analytics table can be exported to CSV format for external analysis in spreadsheets, BI tools, or archival:

```bash
# Export flaky tests using default timestamped filename in <historyDir>/
npx zr history flaky --export

# Export top 10 slowest tests with a custom output filename
npx zr history slow --limit 10 -e slowest-tests.csv

# Export entire historical runs dataset
npx zr history runs --all --export all-runs.csv

# Export results of a custom SQL query
npx zr history query "SELECT file, count(*) as runs FROM history_src GROUP BY file" --export
```

### Auto-Generated Filenames

When no target path is supplied with `--export`, the CSV file is automatically written to `<historyDir>/<dataset-slug>_<YYYY-MM-DD_HHmm>.csv` (e.g. `zen-report/flaky-tests_2026-11-08_2235.csv`).

---

## Database Maintenance & Cleanup

### Cleaning History (`zr history clean`)

Reclaim disk space by safely removing old historical runs from SQLite and deleting orphaned disk attachments:

```bash
# Preview what would be removed without deleting anything
npx zr history clean --keep 50 --dry-run

# Retain the latest 50 runs and purge older runs
npx zr history clean --keep 50

# Delete the 10 oldest runs
npx zr history clean --recent 10

# Delete a specific run by its run ID
npx zr history clean --run-id "2026-11-08T18:00:00.000Z__run-101"

# Delete run by unique run name
npx zr history clean --run-name "PR-Check-101"

# Delete all historical runs
npx zr history clean --all -y
```

#### Available Options for `clean`

| Option              | Description                                                                          |
| :------------------ | :----------------------------------------------------------------------------------- |
| `--all`             | Delete all historical runs and attached media.                                       |
| `--recent <N>`      | Delete the most recent `N` runs.                                                     |
| `--keep <N>`        | Retain the latest `N` runs, purging older ones.                                      |
| `--run-id <ID>`     | Delete a single run matching the unique run ID.                                      |
| `--run-name <NAME>` | Delete a run matching the unique run name (prompts if ambiguous).                    |
| `--dry-run`         | Preview runs and attachments to be deleted without modifying disk.                   |
| `--vacuum`          | Force SQLite `VACUUM` repacking (enabled automatically when >= 10 runs are removed). |
| `--no-vacuum`       | Skip `VACUUM` repacking to speed up deletion.                                        |
| `-y, --yes`         | Skip confirmation prompt for CI automation.                                          |

### Repacking SQLite Database (`zr history vacuum`)

Directly repack `history.db` using SQLite's `VACUUM` command to reclaim unused space from deleted records back to the operating system:

```bash
npx zr history vacuum
```

### Migrating Legacy Logs (`zr history migrate`)

Seamlessly migrate historical `.jsonl` runs into the unified `history.db` SQLite store:

```bash
# Migrate legacy JSONL runs into history.db
npx zr history migrate

# Migrate and clean up old JSONL files after successful migration
npx zr history migrate --clean
```

---

## Custom SQL Queries (`zr history query`)

Execute custom SQL queries against your test run history. When DuckDB connects, `history_src` (or alias `runs`) represents your historical runs view:

```bash
# Query total test count by project
npx zr history query "SELECT project, count(*) as tests FROM history_src GROUP BY project"

# Shorthand query omitting SELECT/FROM (automatically queries FROM history_src)
npx zr history query "WHERE status = 'failed' ORDER BY started_at DESC LIMIT 5"
```

---

## Environment Variables

| Variable             | Description                                                     |
| :------------------- | :-------------------------------------------------------------- |
| `PW_REPORTER_OUTPUT` | Override default output folder path (defaults to `zen-report`). |
| `DEBUG_PLAYWRIGHT`   | Enable verbose diagnostic logging for reporter debugging.       |
