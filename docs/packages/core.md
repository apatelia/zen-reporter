# `@arpanp/zen-core` — Shared Types & Utilities

> Package: `packages/core` · Deps: none · Consumed by: `zen-ui`, `zen-reporter`, `zen-server`

The foundation package of the monorepo. It contains **no runtime framework
code** — only shared domain types, schemas, and pure utility functions that
are reused across the UI, reporter, and server. Published as an ESM/CJS dual
package (`dist/index.js` / `dist/index.cjs` with `dist/index.d.ts` types).

---

## Source Layout

```text
packages/core/
├── package.json
├── tsconfig.json
├── dist/                    # Build output (dual ESM + CJS emit)
└── src/
    ├── index.ts             # Public entry point / re-exports
    ├── types/
    │   ├── report.ts        # Core Playwright execution report models (TestCase, ResultSummary, etc.)
    │   └── history.ts       # Historical analytics & run row schemas
    ├── codeHighlighting.ts  # Syntax highlighting for step code snippets & error stack traces
    ├── cryptoUtils.ts       # MD5/SHA-256 hashing & error signature clustering
    ├── exportFilename.ts    # Sanitized export filename builder
    ├── exportToCsv.ts       # Zero-dependency RFC 4180 CSV exporter with UTF-8 BOM
    ├── formatters.ts        # Duration, timestamp, text & cross-platform file path formatting
    ├── statsUtils.ts        # Single-pass O(N) project stats calculator & executive KPI generator
    ├── stepCategoryClassifier.ts # Title-based step category classification & counters
    ├── tagColors.ts         # Deterministic HSL color generator for tags
    └── theme.ts             # Unified UI theme tokens, brand color maps & status color palettes
```

---

## Key Responsibilities

| Module                      | Purpose                                                                                                       |
| :-------------------------- | :------------------------------------------------------------------------------------------------------------ |
| `types/report.ts`           | Canonical report models shared by all packages: `TestCase`, `ResultSummary`, run metadata, attachment records |
| `types/history.ts`          | Historical run/test row schemas shared by the SQLite store, remote store, and server                          |
| `statsUtils.ts`             | Single-pass O(N) project statistics and executive KPI computation (used by UI and summary generation)         |
| `theme.ts`                  | Theme tokens (Sage, Lotus, Oasis), brand color maps, status color palettes consumed by the UI                 |
| `exportToCsv.ts`            | RFC 4180 CSV export with UTF-8 BOM (used by UI exports and `zr summary`)                                      |
| `codeHighlighting.ts`       | Syntax highlighting for step snippets and error stack traces rendered in the UI                               |
| `cryptoUtils.ts`            | Hashing (MD5/SHA-256) and error signature clustering for flaky/regression detection                           |
| `formatters.ts`             | Duration, timestamp, and file path formatting shared across UI and CLI                                        |
| `stepCategoryClassifier.ts` | Classifies step titles into categories for the Trends tab                                                     |
| `tagColors.ts`              | Deterministic tag colors for tag clouds and filters                                                           |
| `exportFilename.ts`         | Builds safe, sanitized export filenames                                                                       |

---

## Build & Usage

```bash
npm run build -w @arpanp/zen-core   # tsc -p tsconfig.json (dual ESM/CJS emit)
```

All other packages import it as `@arpanp/zen-core` (workspace-resolved).
Because it is the single source of truth for report and history schemas, any
schema change starts here and ripples to `zen-ui`, `zen-reporter`, and
`zen-server`.
