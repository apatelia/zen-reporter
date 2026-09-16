# Zen Reporter

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

Beautiful test execution reports for Playwright.

Zen Reporter transforms Playwright's raw test results into an interactive, visually stunning dashboard. It provides a clean, modern interface for exploring test suites, analyzing pass/fail rates, and diving into individual test failures with full step-by-step execution traces and error stacks.

## Features

- **Interactive Dashboard** — Navigate test results through Overview, Suites, and Failures tabs
- **Multi-Project & Parallel Execution** — Track and compare results across multiple Playwright projects (e.g., Chromium, Firefox, WebKit) and parallel worker execution times
- **Interrupted Status Support** — Explicitly captures and reports worker crash or SIGKILL interrupted test states across charts, KPIs, and failure tabs
- **Rich Filtering** — Filter test cases by project, status (`passed`, `failed`, `skipped`, `timedOut`, `interrupted`), tag, or test file name
- **Detailed Failure & Retry Analysis** — Expand test cases to inspect individual retry attempts (`Run`, `Retry #1`, `Retry #2`), step-by-step execution, sub-steps, duration, highlighted stack traces (`Expected` vs `Received`), and attachment previews (images, and text)
- **Visual Metrics & Quick Stats** — Pass rate ring, project bar charts, KPI cards with calculation tooltips, and file summary tables
- **Dark Mode & Accessibility** — Toggle between light and dark themes with high-contrast WCAG-compliant status badges and buttons
- **Single-File Output** — Self-contained HTML report for easy sharing and CI/CD archiving

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
      },
    ],
  ],
});
```

### Options Reference

| Option        | Type     | Default                     | Description                                                         |
| :------------ | :------- | :-------------------------- | :------------------------------------------------------------------ |
| `outputDir`   | `string` | `"zen-report"`              | Directory where final report files are saved.                       |
| `projectName` | `string` | `"Test Automation Project"` | Project name displayed prominently in the top bar of the dashboard. |
| `testRunName` | `string` | `"Test Run #1"`             | Test run or build name displayed in the top bar of the dashboard.   |

---

## Usage

### 1. Running Tests

Run your Playwright tests as usual. Zen Reporter will automatically record test run metadata, build structured suite trees, and generate the standalone HTML report:

```bash
npm run test
```

### 2. Viewing the Generated Report

Launch the built-in report server to open the interactive dashboard in your browser:

```bash
npx zen-reporter show
```
