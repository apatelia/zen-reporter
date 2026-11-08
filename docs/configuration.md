# Zen Reporter Configuration Guide

This guide covers all configuration options, type specifications, theme selections, and production recipes for `@arpanp/zen-reporter`.

---

## Basic vs. Advanced Setup

In Playwright, reporters are configured in `playwright.config.ts` (or `playwright.config.js`).

### Zero-Config Setup

By default, Zen Reporter operates out of the box with sensible defaults (`outputDir: 'zen-report'`, `theme: 'Sage'`, automatic console tickers, and local SQLite history):

```ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  reporter: '@arpanp/zen-reporter',
});
```

### Advanced Setup (Tuple Syntax)

To customize reporter behavior, pass an options object using Playwright's reporter tuple syntax:

```ts
import { defineConfig } from '@playwright/test';
import type { ZenReporterOptions } from '@arpanp/zen-reporter';

const zenOptions: ZenReporterOptions = {
  outputDir: 'zen-report',
  projectName: 'E2E Test Automation',
  testRunName: 'Release Candidate #{N}',
  theme: 'Sage',
  darkMode: 'system',
  singleSummaryFile: true,
  enableHistory: 'auto',
  consoleProgress: 'auto',
  openAutomatically: 'never',
};

export default defineConfig({
  reporter: [['@arpanp/zen-reporter', zenOptions]],
});
```

> **Interactive Generator**: You can also tune these options visually! Click **Config Generator** at the bottom of the Zen Reporter dashboard sidebar to adjust settings interactively and copy the exact TypeScript or JavaScript configuration snippet.

---

## Configuration Options Reference

| Option              | Type                                       | Default                     | Description                                                                                                                                                            |
| :------------------ | :----------------------------------------- | :-------------------------- | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `outputDir`         | `string`                                   | `"zen-report"`              | Directory where the report bundle, media attachments, and SQLite database are saved.                                                                                   |
| `projectName`       | `string`                                   | `"Test Automation Project"` | Project title displayed in the dashboard navigation header.                                                                                                            |
| `testRunName`       | `string`                                   | `"Test Run #{N}"`           | Dynamic run title template displayed in the top bar. `{N}` is dynamically replaced with the monotonic run sequence number.                                             |
| `theme`             | `'Sage' \| 'Lotus' \| 'Oasis'`             | `"Sage"`                    | Initial color theme applied to the web dashboard. Legacy names (`"Cafe"`, `"Sentinel"`, `"Streak"`) are automatically remapped.                                        |
| `darkMode`          | `boolean \| 'system'`                      | `"system"`                  | Initial dark/light mode state. When set to `"system"`, it matches the operating system preference.                                                                     |
| `singleSummaryFile` | `boolean`                                  | `false`                     | When `true`, generates a standalone `summary.html` and `summary.json` file designed for executive summaries and CI artifact attachments.                               |
| `minimalReport`     | `boolean`                                  | `false`                     | When `true`, disables history tracking and suppresses analytical charts (Trends, Insights, Projects) for an ultra-lean report.                                         |
| `enableHistory`     | `'auto' \| boolean \| object`              | `"auto"`                    | Controls historical execution tracking. Can be `"auto"` (active for multi-run tracking), a boolean, or an advanced configuration object (`mode: 'local' \| 'remote'`). |
| `consoleProgress`   | `'auto' \| 'line' \| 'dot' \| boolean`     | `"auto"`                    | Terminal execution ticker style. `"auto"` chooses `line` in interactive TTY sessions and `dot` in non-interactive CI environments.                                     |
| `openAutomatically` | `'always' \| 'never' \| 'on-failure-only'` | `"never"`                   | Controls whether to automatically open the report in a web browser upon test completion.                                                                               |

---

## Deep Dive: Key Configuration Areas

### 1. Visual Themes & Dark Mode

Zen Reporter provides three nature-inspired color themes crafted for data clarity:

- **`Sage`** (Default): Crisp, calm eucalyptus green and slate neutrals.
- **`Lotus`**: Warm plum, rose, and amethyst accents.
- **`Oasis`**: Deep ocean teal and cyan tones.

```ts
export default defineConfig({
  reporter: [
    [
      '@arpanp/zen-reporter',
      {
        theme: 'Oasis',
        darkMode: true, // Force dark mode on first visit
      },
    ],
  ],
});
```

_Note_: User theme toggles in the browser are persisted in browser `localStorage`, so user preferences will be remembered across sessions.

---

### 2. Terminal Progress & Console Output

Zen Reporter provides sleek console progress tickers during test execution:

- **`'auto'`** (Default): Automatically displays a live updating single-line status bar (`line`) in interactive TTY terminals, and a minimal dot indicator (`dot`) in CI pipelines.
- **`'line'`**: Interactive multi-metric single-line progress bar showing active workers, current percentage, and live pass/fail counts.
- **`'dot'`**: Lightweight dot streamer (`.` for pass, `F` for fail, `S` for skip) optimized for CI build logs.
- **`false`**: Completely suppresses console progress indicators during test execution (final summary table is still printed upon completion).

```ts
export default defineConfig({
  reporter: [
    [
      '@arpanp/zen-reporter',
      {
        consoleProgress: process.env.CI ? 'dot' : 'line',
      },
    ],
  ],
});
```

---

### 3. Historical Tracking & Storage Engines

#### Local SQLite Mode (Default)

By default, Zen Reporter records cross-run execution metrics and media references into an embedded SQLite database (`history.db`) inside your `outputDir`. It requires zero external database servers:

```ts
export default defineConfig({
  reporter: [
    [
      '@arpanp/zen-reporter',
      {
        enableHistory: 'auto', // Records to <outputDir>/history.db
      },
    ],
  ],
});
```

#### Remote SaaS / Multi-Cloud Mode

For distributed teams or enterprise multi-shard architectures, Zen Reporter can stream run telemetry directly to a centralized `@arpanp/zen-server` backed by PostgreSQL and Cloud Object Storage (S3 / GCS / Azure):

```ts
export default defineConfig({
  reporter: [
    [
      '@arpanp/zen-reporter',
      {
        enableHistory: {
          mode: 'remote',
          serverUrl: process.env.ZEN_SERVER_URL || 'https://zen-reporter.internal',
          apiKey: process.env.ZEN_API_KEY,
          projectId: 'frontend-e2e',
        },
      },
    ],
  ],
});
```

---

### 4. Standalone Executive Summary (`summary.html`)

When `singleSummaryFile: true` is enabled, Zen Reporter generates an independent, self-contained `summary.html` in your `outputDir`:

- **Ultra-compact file size**: Single lightweight HTML file containing key KPIs, pass rates, duration, and top failures.
- **Perfect for CI/CD integrations**: Attach it as a GitHub Actions Job Summary, GitLab artifact, or embed it in automated Slack / email notifications.

```ts
export default defineConfig({
  reporter: [
    [
      '@arpanp/zen-reporter',
      {
        singleSummaryFile: true,
      },
    ],
  ],
});
```

---

## Production Recipes

### 1. CI / GitHub Actions Pipeline

Optimized for automated build environments: non-interactive progress, no auto-open, standalone summary enabled for job artifacts:

```ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  reporter: [
    [
      '@arpanp/zen-reporter',
      {
        outputDir: 'zen-report',
        projectName: 'Web App E2E',
        testRunName: `CI Build #${process.env.GITHUB_RUN_NUMBER || 'Local'}`,
        consoleProgress: 'dot',
        openAutomatically: 'never',
        singleSummaryFile: true,
      },
    ],
  ],
});
```

### 2. Local Developer Ergonomics

Optimized for local test iteration: opens the browser automatically only when tests fail, and displays a rich interactive terminal progress bar:

```ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  reporter: [
    [
      '@arpanp/zen-reporter',
      {
        projectName: 'Local Dev Suite',
        consoleProgress: 'line',
        openAutomatically: 'on-failure-only',
        theme: 'Sage',
        darkMode: 'system',
      },
    ],
  ],
});
```

### 3. Lightweight / Minimal Mode

For quick unit or smoke test runs where historical data and secondary analytics tabs are not needed:

```ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  reporter: [
    [
      '@arpanp/zen-reporter',
      {
        minimalReport: true, // Disables history and hides Trends/Insights tabs
        consoleProgress: 'line',
      },
    ],
  ],
});
```
