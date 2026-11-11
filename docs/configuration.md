# Zen Reporter Configuration Guide

This guide covers all configuration options, type specifications, theme selections, and production recipes for `@arpanp/zen-reporter`.

---

## Basic vs. Advanced Setup

In Playwright, reporters are configured in `playwright.config.ts` (or `playwright.config.js`).

### Zero-Config Setup

By default, Zen Reporter operates out of the box with sensible defaults (`outputDir: 'zen-report'`, `theme: 'Sage'`, automatic console tickers, local SQLite history, and OS-driven dark mode):

```ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  reporter: '@arpanp/zen-reporter',
});
```

### Advanced Setup (Tuple Syntax)

To customize reporter behavior, pass an options object using Playwright's reporter tuple syntax. The options object is a plain object — no type imports are required:

```ts
import { defineConfig } from '@playwright/test';

const zenOptions = {
  outputDir: 'zen-report',
  projectName: 'E2E Test Automation',
  testRunName: 'Release Candidate #{N}',
  theme: 'Oasis',
  darkMode: false,
  singleSummaryFile: true,
  consoleProgress: 'auto',
  openAutomatically: 'on-failure-only',
};

export default defineConfig({
  reporter: [['@arpanp/zen-reporter', zenOptions]],
});
```

If you want to type the advanced `history` object, the package exports `HistoryConfig`, `LocalHistoryConfig`, `RemoteHistoryConfig`, and `DisabledHistoryConfig`:

```ts
import type { RemoteHistoryConfig } from '@arpanp/zen-reporter';

const remoteHistory: RemoteHistoryConfig = {
  mode: 'remote',
  serverUrl: process.env.ZEN_SERVER_URL || 'https://zen-reporter.internal',
  apiKey: process.env.ZEN_API_KEY,
  projectId: 'frontend-e2e',
};
```

> **Interactive Generator**: You can also tune these options visually! Click **Config Generator** at the bottom of the Zen Reporter dashboard sidebar to adjust settings interactively and copy the exact TypeScript or JavaScript configuration snippet.

---

## Configuration Options Reference

| Option              | Type                                       | Default                     | Description                                                                                                                                                                                                                   |
| :------------------ | :----------------------------------------- | :-------------------------- | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `outputDir`         | `string`                                   | `"zen-report"`              | Directory where the report bundle, media attachments, and SQLite database are saved.                                                                                                                                          |
| `projectName`       | `string`                                   | `"Test Automation Project"` | Project title displayed in the dashboard navigation header.                                                                                                                                                                   |
| `testRunName`       | `string`                                   | `"Test Run #{N}"`           | Dynamic run title displayed in the top bar. `{N}` is dynamically replaced with the monotonic run sequence number derived from the most recent run in `history.db`.                                                            |
| `theme`             | `'Sage' \| 'Lotus' \| 'Oasis'`             | `"Sage"`                    | Initial color theme applied to the web dashboard. Legacy names (`"Cafe"`, `"Sentinel"`, `"Streak"`) are automatically remapped.                                                                                               |
| `darkMode`          | `'system' \| 'light' \| 'dark' \| boolean` | `'system'`                  | Initial dark/light mode: `'system'` follows the OS preference, `'dark'`/`true` forces dark, `'light'`/`false` forces light                                                                                                    |
| `singleSummaryFile` | `boolean`                                  | `false`                     | When `true`, generates a standalone `summary.html` and `summary.json` file designed for executive summaries and CI artifact attachments.                                                                                      |
| `minimalReport`     | `boolean`                                  | `false`                     | When `true`, disables history tracking and suppresses analytical charts (Trends, Insights, Projects) for an ultra-lean report.                                                                                                |
| `enableHistory`     | `'auto' \| boolean`                        | `"auto"`                    | Simple history switch. `"auto"` records to local SQLite and only warns on failure. `true` additionally requires the optional `@duckdb/node-api` package (hard error at start if not installed). `false` disables history.     |
| `history`           | `HistoryConfig`                            | _unset_                     | Advanced history configuration: `true`, `false`, `{ mode: 'local', ... }`, `{ mode: 'remote', ... }`, or `{ mode: 'off' }`. Takes precedence over `enableHistory` when both are set. See History Configuration Details below. |
| `consoleProgress`   | `'auto' \| 'line' \| 'dot' \| boolean`     | `"auto"`                    | Terminal execution ticker style. `"auto"` chooses `line` in interactive TTY sessions and `dot` in non-interactive CI environments.                                                                                            |
| `openAutomatically` | `'always' \| 'never' \| 'on-failure-only'` | `"never"`                   | Controls whether to automatically open the report in a web browser upon test completion.                                                                                                                                      |

> `packageManager` appears in the resolved configuration but is auto-detected from the project — it is not a user-facing option.

### History Configuration Details (`history`)

**Local** (default engine — all fields optional):

```ts
history: {
  mode: 'local', // optional; local is the default
  dbPath: 'data/history.db', // optional; defaults to <outputDir>/history.db
  maxRuns: 1000, // optional; retention: max runs kept in history.db (0 = unlimited); default 1000
  windowSize: 50, // optional; max runs embedded into the static HTML report; default 50
}
```

**Remote** (SaaS / multi-cloud — `mode` and `serverUrl` required):

```ts
history: {
  mode: 'remote',
  serverUrl: process.env.ZEN_SERVER_URL || 'https://zen-reporter.internal',
  apiKey: process.env.ZEN_API_KEY, // optional; tenant authentication
  projectId: 'frontend-e2e', // optional; explicit project/repo identifier
  runId: process.env.GITHUB_RUN_ID, // optional; idempotency key; auto-detected from CI env vars if omitted
  fallbackToLocal: true, // optional; default true — keeps a local SQLite copy when the server is unreachable
  timeoutMs: 5000, // optional; default 5000 ms per ingestion request
}
```

**Disabled**:

```ts
history: {
  mode: 'off';
}
```

**Precedence rules:**

- `history` takes precedence over `enableHistory` when both are set.
- `minimalReport: true` forces history off regardless of either.

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

`darkMode` is a tri-state option with legacy boolean support: `'system'` (the default) follows the OS preference, `true` (or `'dark'`) forces dark, and `false` (or `'light'`) forces light. Omitting the option is equivalent to `'system'`.

_Note_: User theme and mode toggles in the browser are persisted in browser `localStorage`, so a per-browser preference is remembered across visits and overrides the configured initial values.

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

By default, Zen Reporter records cross-run execution metrics and media references into an embedded SQLite database (`history.db`) inside your `outputDir` using Node's built-in `node:sqlite` engine. It requires zero external database servers:

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

The simple switch semantics:

- **`"auto"`** (Default): Records to local SQLite; failures are logged as warnings and never fail the run.
- **`true`**: Same, but additionally requires the optional `@duckdb/node-api` package (used by the `zr history` CLI query engine); throws at start if it is not installed.
- **`false`**: No history is written.

For custom local paths, retention, or embedded-report window size, use the `history` object shown in History Configuration Details above.

#### Remote SaaS / Multi-Cloud Mode

For distributed teams or enterprise multi-shard architectures, Zen Reporter can stream run telemetry directly to a centralized `@arpanp/zen-server` backed by PostgreSQL and Cloud Object Storage (S3 / GCS / Azure):

```ts
export default defineConfig({
  reporter: [
    [
      '@arpanp/zen-reporter',
      {
        history: {
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

## Keeping Options in a Separate File

When the options object grows — most commonly with remote history and its credentials — move it into a dedicated `zen.config.json` file and keep `playwright.config.ts` lean. The reporter auto-discovers this file: on startup it probes for `zen.config.json` in the same directory as your `playwright.config.ts` and merges it into the resolved options.

```json
{
  "outputDir": "zen-report",
  "projectName": "Web App E2E",
  "testRunName": "CI Build #{N}",
  "singleSummaryFile": true,
  "history": {
    "mode": "remote",
    "serverUrl": "https://zen-reporter.internal",
    "apiKey": "secret-key",
    "projectId": "frontend-e2e"
  }
}
```

No change to `playwright.config.ts` is required — keep only the options you want visible inline in the tuple:

```ts
export default defineConfig({
  reporter: [['@arpanp/zen-reporter', { theme: 'Oasis' }]],
});
```

Rules:

- **Precedence is field-by-field**: inline options in the `playwright.config.ts` reporter tuple win over `zen.config.json`, which wins over built-in defaults. Only fields you omit inline are filled from the file.
- **One directory only**: the file is probed exactly where `playwright.config.ts` lives — no upward search, no global locations.
- **Fail loudly**: a malformed `zen.config.json` (invalid JSON, or anything other than a plain object) aborts the run with a clear error — the file is never silently ignored.
- **Plain data only**: the file is JSON, so no code executes in it (no `process.env`, no computed values) — credentials must be static values.

### Manual import (for comments or `process.env`)

If you want in-file comments or environment-variable reads, keep a `zen.config.ts` (or `zen.config.js`) module next to the Playwright config and wire it in with a regular import. The imported object counts as inline options, so it still wins field-by-field over `zen.config.json` when both are present:

```ts
// zen.config.ts
export default {
  projectName: 'Web App E2E',
  history: {
    mode: 'remote',
    serverUrl: process.env.ZEN_SERVER_URL || 'https://zen-reporter.internal',
    apiKey: process.env.ZEN_API_KEY,
    projectId: 'frontend-e2e',
  },
};
```

```ts
// playwright.config.ts
import { defineConfig } from '@playwright/test';
import zenOptions from './zen.config';

export default defineConfig({
  reporter: [['@arpanp/zen-reporter', zenOptions]],
});
```

The module must default-export a **plain object** of options (no functions, no top-level `await`).

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

Optimized for local test iteration: opens the browser automatically only when tests fail, and displays a rich interactive terminal progress bar. `darkMode` is omitted so the dashboard follows the OS preference:

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
