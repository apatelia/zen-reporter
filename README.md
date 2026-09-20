# Zen Reporter

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

Beautiful test execution reports for Playwright.

Zen Reporter transforms Playwright's raw test results into an interactive, visually stunning dashboard. It provides a clean, modern interface for exploring test suites, analyzing pass/fail rates, and diving into individual test failures with full step-by-step execution traces, source code snippets, syntax highlighting, and error stacks.

Light mode:

![Dashboard Overview - Light Mode](docs/screenshots/light-mode.png)

Dark mode:

![Dashboard Overview - Dark Mode](docs/screenshots/dark-mode.png)

## Features

- **Interactive 8-Tab Dashboard Navigation**:
  1. **Overview** — High-level summary metrics, radial pass rate ring, execution efficiency indicators, test health breakdown, calculation tooltips, and run environment stats (duration, projects, suites, test count, worker threads).
  2. **Projects** — Per-project execution status bar charts (including interrupted task breakdowns), volume & coverage distribution, and project detail cards comparing Playwright project profiles.
  3. **Suites** — Interactive, searchable tree view container for nested `describe` suites with collapsible nodes (`TestSuiteNode`), bulk expand/collapse controls, retry badges, and test case cards.
  4. **Files** — Spec file summary tables detailing per-file test counts and status distributions (passed, failed, skipped, interrupted), paired with paginated table navigation.
  5. **Failures** — Deep-dive failure analysis with two grouping modes:
     - **File Grouping**: Collapsible spec file lists with failure summaries.
     - **Error Signature Clustering**: Normalizes dynamic tokens (timestamps, UUIDs, memory addresses, line numbers) to group identical root causes into deterministic **Shared Issue** clusters.
     - **Execution Traces & Step Snippets**: Step-by-step execution steps with target indicators (`▶`), source code snippets, syntax highlighting, step parameters, nested sub-steps, diff stack traces (`Expected` vs `Received`), retry attempt tabs (`Run`, `Retry #1`), and attachment previews (images, videos, traces).
  6. **History** — Historical test runs table detailing run metadata, execution mode (`Parallel, N workers` vs `Serial`), wall-clock duration, pass/fail ratios, and automated quality rating tooltips (`Excellent`, `Needs improvement`, `Critical`).
  7. **Trends** — Visual quality trend charts tracking pass rate percentage over time, multi-project execution duration trends (multi-line tracking per Playwright project across runs), and step category trends.
  8. **Insights** — Advanced test intelligence powered by an embedded DuckDB analytics pipeline:
     - **Flaky Intelligence**: Detects tests fluctuating between pass and fail across historical runs.
     - **Regression Tracking**: Identifies tests that previously passed but regressed to failed in the latest run.
     - **Slowest Tests Analysis**: Ranks top 5 slowest test cases by average execution duration across runs.
     - **P95 Duration & Latency**: Analyzes 95th percentile completion thresholds per project profile.

- **Cross-Cutting Capabilities**:
  - **Themes & Dark Mode**: Multiple design system themes (`Starbucks`, `Notion`, `Sentry`) with light and dark mode toggles, built with WCAG-compliant color tokens, soft-lift shadows, and warm canvas palettes. Configurable initial theme and dark mode defaults.
  - **Single-File Standalone HTML & Summary Output**: Generates a self-contained single-file HTML report (`index.html`) with embedded datasets for easy sharing and CI/CD artifact storage. Optionally creates a lightweight standalone `summary.html` (via `singleSummaryFile: true`) dedicated to executive overview dashboards without full trace trees.

---

## Installation

```bash
npm install zen-reporter
```

---

## Configuring Zen Reporter in Playwright

Add `zen-reporter` to your `playwright.config.ts` (or `playwright.config.js`):

### Basic Configuration

```ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  reporter: 'zen-reporter',
});
```

### Advanced Configuration (With Options)

You can pass configuration options using the tuple syntax in Playwright:

```ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  reporter: [
    [
      'zen-reporter',
      {
        outputDir: 'zen-report', // Optional: Output directory where report files will be generated (default: "zen-report")
        projectName: 'My E2E Project', // Optional: Project name displayed in the top bar header
        testRunName: 'Nightly Build #42', // Optional: Test run / build name displayed in the top bar header
        theme: 'Starbucks', // Optional: Theme applied on initial load ("Starbucks" | "Notion" | "Sentry", default: "Starbucks")
        darkMode: false, // Optional: Initial dark mode state (default: false)
        singleSummaryFile: true, // Optional: Generates a standalone summary.html file alongside index.html
      },
    ],
  ],
});
```

### Options Reference

| Option              | Type      | Default                     | Description                                                          |
| :------------------ | :-------- | :-------------------------- | :------------------------------------------------------------------- |
| `outputDir`         | `string`  | `"zen-report"`              | Directory where final report files are saved.                        |
| `projectName`       | `string`  | `"Test Automation Project"` | Project name displayed prominently in the top bar of the dashboard.  |
| `testRunName`       | `string`  | `"Test Run #1"`             | Test run or build name displayed in the top bar of the dashboard.    |
| `theme`             | `string`  | `"Starbucks"`               | Theme applied on first load (`"Starbucks"`, `"Notion"`, `"Sentry"`). |
| `darkMode`          | `boolean` | `false`                     | When set to `true`, the report loads in dark mode on first load.     |
| `singleSummaryFile` | `boolean` | `false`                     | Generates a standalone `summary.html` for executive summary views.   |

---

## Usage

### 1. Running Tests

Run your Playwright tests as usual. Zen Reporter will automatically record test run metadata, build structured suite trees, and generate the standalone HTML report:

```bash
npx playwright test
```

### 2. Viewing the Generated Report

Launch the built-in report server to open the interactive dashboard in your browser using `npx zr show`:

```bash
npx zr show
```

### 3. CLI Commands Reference (`zr`)

Zen Reporter includes a built-in CLI executable (`npx zr`) for serving reports and querying historical test execution data:

#### Report Server

- **`npx zr show`** — Launch the report server to view `index.html` in your default browser.

#### History & Intelligence (`zr history`)

> **Note**: History commands analyze stored JSONL run logs via DuckDB. Ensure `@duckdb/node-api` is installed in your project (`npm i -D @duckdb/node-api`).

| Command                           | Description                                                                                 |
| :-------------------------------- | :------------------------------------------------------------------------------------------ |
| `npx zr history`                  | List all historical test runs with start time, duration, and pass/fail/skip counts.         |
| `npx zr history flaky`            | Identify flaky tests that passed in some runs and failed in others.                         |
| `npx zr history regressions`      | List tests that passed in a previous run but failed in the latest run.                      |
| `npx zr history slow [--limit N]` | Rank the top $N$ slowest tests by average execution duration across runs (default: 10).     |
| `npx zr history trend`            | Display historical pass rate percentages per run over time.                                 |
| `npx zr history report`           | Build `history.json` and inject it into `index.html` to populate the History & Trends tabs. |
| `npx zr history query "<SQL>"`    | Run arbitrary DuckDB SQL queries over recorded test runs.                                   |
