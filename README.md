# Zen Reporter

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

Beautiful test execution reports for Playwright.

Zen Reporter transforms Playwright's raw test results into an interactive, visually stunning dashboard. It provides a clean, modern interface for exploring test suites, analyzing pass/fail rates, and diving into individual test failures with full step-by-step execution traces and error stacks.

## Features

- **Interactive Dashboard** — Navigate test results through Overview, Suites, and Failures tabs
- **Multi-Project Support** — Track and compare results across multiple Playwright projects (e.g., Chromium, Firefox, WebKit)
- **Rich Filtering** — Filter test cases by project, status (`passed`, `failed`, `skipped`, `timedOut`), tag, or test file name.
- **Detailed Failure Analysis** — Expand failed test cases to view step-by-step execution steps, sub-steps, timing, and sanitized error stack traces
- **Visual Metrics** — Pass rate rings, project bar charts, quick KPIs, and test file summaries at a glance
- **Dark Mode** — Toggle between light and dark themes with persistent preference storage
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
      },
    ],
  ],
});
```

### Options Reference

| Option      | Type     | Default        | Description                                   |
| :---------- | :------- | :------------- | :-------------------------------------------- |
| `outputDir` | `string` | `"zen-report"` | Directory where final report files are saved. |

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
