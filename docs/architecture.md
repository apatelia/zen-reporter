# Project Structure & Architecture

Zen Reporter is a **multi-package monorepo** (npm workspaces). The root `package.json` (`zen-reporter-monorepo`) owns the workspaces config, shared
lint/test/format scripts, and the Playwright test configuration. All runtime code lives under `packages/`.

```text
zen-reporter/
├── package.json               # Monorepo root (npm workspaces: packages/*)
├── playwright.config.ts       # Playwright config for the repo's own test suite
├── tests/                     # Playwright specs for Zen Reporter itself
├── zen-report/                # Generated self-contained report bundle output
└── packages/
    ├── core/                  # @arpanp/zen-core                → see [core](packages/core.md)
    ├── cli/                   # @arpanp/zen-cli                 → see [cli](packages/cli.md)
    ├── ui/                    # @arpanp/zen-ui                  → see [ui](packages/ui.md)
    ├── reporter-playwright/   # @arpanp/zen-reporter-playwright → see [reporter](packages/reporter-playwright.md)
    └── server/                # @arpanp/zen-server              → see [server](packages/server.md)
```

---

## Package Dependency Graph

```mermaid
flowchart TD
    CORE["@arpanp/zen-core<br/>types, schemas & shared utilities"]
    CLI["@arpanp/zen-cli<br/>CLI (zr), history engine & viewer"]
    UI["@arpanp/zen-ui<br/>React dashboard (report viewer)"]
    REP["@arpanp/zen-reporter-playwright<br/>Playwright reporter adapter"]
    SRV["@arpanp/zen-server<br/>Hono SaaS ingestion API"]

    CLI -->|depends on| CORE
    UI -->|depends on| CORE
    REP -->|depends on| CORE
    REP -->|depends on| CLI
    SRV -->|depends on| CORE
    REP -. devDependency (build-time template) .-> UI
```

### Package Overview

| Package                           | Role                                                                                                                           | Depends on                                                      | Built with                  |
| :-------------------------------- | :----------------------------------------------------------------------------------------------------------------------------- | :-------------------------------------------------------------- | :-------------------------- |
| `@arpanp/zen-core`                | Shared domain types, report/history schemas, and pure utility functions (CSV export, formatting, stats, theming, highlighting) | —                                                               | `tsc` (ESM + CJS dual emit) |
| `@arpanp/zen-cli`                 | CLI commands (`zr`, `zen-reporter`), history querying & persistence (SQLite/DuckDB), report serving, and system diagnostics    | `zen-core`                                                      | `vite` + `tsc`              |
| `@arpanp/zen-ui`                  | Interactive HTML report dashboard; single-file Vite/React bundle with all UI tabs                                              | `zen-core`                                                      | `vite`                      |
| `@arpanp/zen-reporter-playwright` | Playwright reporter lifecycle, report bundle generation, and test execution data processing                                    | `zen-core`, `zen-cli` (runtime); `zen-ui` (build-time template) | `vite` + `tsc`              |
| `@arpanp/zen-server`              | Multi-tenant Hono API for run ingestion, PostgreSQL persistence, and multi-cloud (S3/GCS/Azure) attachment storage             | `zen-core`                                                      | `tsc`                       |

> **Note:** `zen-reporter-playwright` consumes the built UI bundle as a build-time asset:
> `zen-ui` is declared as a devDependency, and `build:template`
> (`scripts/copy-template.mjs`) copies `index.html` + `favicon-*.svg` from the
> resolved `zen-ui` package into the reporter's `dist/`. It is never imported
> at runtime. Conversely, the UI's `vite.config.ts` imports
> `@arpanp/zen-reporter-playwright` (resolved via its `dist/` when Vite bundles the
> config file), so the reporter must be bundled before the UI builds.
> Build order: `core → cli → reporter:playwright (bundle) → ui → reporter:playwright (template) → server`
> (root script: `npm run build`).

---

## High-Level Data Flow

```mermaid
flowchart TD
    PW["Playwright Test Execution"] -->|lifecycle hooks| REP["zen-reporter<br/>(reporter.ts, history stores)"]
    REP -->|report.json + history + attachments| BUNDLE["Self-contained report bundle<br/>(index.html)"]
    BUNDLE -->|embedded datasets| UI["zen-ui dashboard<br/>(Overview, Projects, Suites, Files, Failures, History, Insights, Trends)"]
    REP -->|remote mode| SRV["zen-server (Hono API)"]
    SRV --> PG[("PostgreSQL")]
    SRV --> OBJ[("S3 / GCS / Azure object storage")]
    UI -->|lazy-load remote details| SRV
```

- **Local mode:** the reporter writes `report.json`, SQLite `history.db`, and
  attachment files next to the generated `index.html`. The UI renders from
  datasets inlined into that single HTML file. See [reporter](packages/reporter.md).
- **Remote mode:** `RemoteHistoryStore` (in the reporter) uploads attachments
  directly to cloud storage via presigned URLs and streams run metadata to the
  server. The UI lazily fetches heavy test details from the server. See
  [server](packages/server.md) and [reporter](packages/reporter.md).

---

## Detailed Package Documentation

- [`packages/core.md`](packages/core.md) — shared types, schemas & utilities
- [`packages/ui.md`](packages/ui.md) — dashboard architecture, tabs & components
- [`packages/reporter.md`](packages/reporter.md) — reporter lifecycle, CLI & data flow
- [`packages/server.md`](packages/server.md) — backend API, storage & REST reference
