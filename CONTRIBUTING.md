# Contributing

Zen Reporter is an npm workspaces monorepo — all runtime code lives under `packages/` (`core`, `ui`, `reporter`, `server`).

## Prerequisites

- Node.js >= 22 (see `engines` in the root `package.json`)
- npm (the repo uses npm workspaces and `package-lock.json`)

## Setup (fresh clone)

```bash
git clone https://github.com/apatelia/zen-reporter.git
cd zen-reporter
npm install
npm run build

# Install Playwright browsers
npx playwright install
```

`npm run build` bootstraps every package in the correct dependency order:

```text
core → reporter (bundle) → ui → reporter (template) → server
```

### Why the build order matters

All package `dist/` folders are gitignored, and there is a **build-time cycle** between `ui` and `reporter`:

1. `packages/ui/vite.config.ts` imports `@arpanp/zen-reporter`. When Vite bundles the config file, it resolves that package through its `dist/` — so the reporter must be **bundled before** the UI builds. (The `resolve.alias` to reporter source only applies to the app bundle, not to config-file bundling.)
2. The reporter's full build copies the built UI bundle (`packages/ui/dist/index.html` + `favicon-*.svg`) into its own `dist/` as the self-contained report template — so the **UI must be built before** the reporter's final build.

The root `build` script resolves this by bundling the reporter, building the UI, then running the full reporter build (template copy and rebuild). If you ever build packages individually, follow the same order. See [docs/architecture.md](docs/architecture.md) for the full dependency graph.

## Scripts

| Script                                                                | Purpose                                                        |
| :-------------------------------------------------------------------- | :------------------------------------------------------------- |
| `npm run build`                                                       | Full monorepo build in correct fresh-clone order               |
| `npm run dev`                                                         | Builds `core` + reporter bundle, then starts the UI dev server |
| `npm run build:core` / `build:ui` / `build:reporter` / `build:server` | Individual package builds                                      |
| `npm run typecheck`                                                   | Type-check all packages + the test suite                       |
| `npm run lint` / `npm run lint:unused`                                | ESLint + unused local/parameter checks                         |
| `npm run format` / `npm run format:check`                             | Prettier write / verify                                        |
| `npm run spellcheck`                                                  | cspell across code, docs, and comments                         |

Prefer these package scripts over invoking `tsc`/`vite`/`prettier` directly.

## Development server

`npm run dev` serves the UI dev server. It reads report data from the report directory (default `<repo-root>/zen-report/`; override with `PW_REPORTER_OUTPUT`) — generate one by running `npm run test`.

## Testing

- The repo's own test suite uses **Playwright only** (`tests/`). No other test runner is configured.
- ⚠️ Some tests **intentionally** fail or time out to produce realistic failure fixtures for the reporter output. Do not attempt to "fix" them.
