# `@arpanp/zen-cli` — Terminal Interface, History Engine & Report Viewer

`@arpanp/zen-cli` provides the standalone terminal dashboard, command-line interface (`zr` and `zen-reporter`), DuckDB/SQLite local history querying engine, and static HTTP viewer for Zen Reporter.

---

## Role in the Architecture

```mermaid
flowchart LR
    Reporter["@arpanp/zen-reporter-playwright"] -->|records runs| CLI["@arpanp/zen-cli<br/>(History Engine + Server)"]
    CLI -->|reads / updates| DB[("history.db<br/>(DuckDB / SQLite)")]
    CLI -->|serves| Report["zen-report/<br/>(HTML Report)"]
```

`@arpanp/zen-cli` acts as the runner-agnostic management and serving layer:

- **CLI Binaries**: Provides `zr` and `zen-reporter` globally or locally via `npx`.
- **History Storage**: Contains `SqliteHistoryStore` (DuckDB embedded queries) and `RemoteHistoryStore` (Zen Server sync).
- **Report Serving**: Serves the generated static HTML report via `zr show`.
- **Diagnostics & Data**: Provides `zr env`, `zr summary`, `zr history query`, and CSV exports.

---

## Installation

Typically installed as a direct dependency of reporter packages (such as `@arpanp/zen-reporter-playwright`), or installed explicitly for standalone report viewing:

```bash
npm install @arpanp/zen-cli
```

---

## Commands

See [CLI Documentation](../cli.md) for full usage and command syntax.

```bash
# Serve generated report
npx zr show

# Inspect historical trends and runs
npx zr history
npx zr history flaky
npx zr history slow
npx zr history trend

# Output Markdown summary snippet
npx zr summary
```
