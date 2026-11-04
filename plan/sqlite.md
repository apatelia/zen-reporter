# Migration to SQLite for local history tracking

Switching to SQLite as the underlying storage engine (while utilizing DuckDB's SQLite extension or native DuckDB file querying) is an **excellent architectural decision**. Here is a detailed breakdown of how performance scales at 1,000–5,000 runs, and how it impacts CI/CD historical persistence:

---

## 🚀 Performance Scaling at 1,000 to 5,000 Runs

| Metric / Scenario                                | Raw JSON / JSONL (Current)                                                                               | SQLite Database Storage                                                                                               |
| :----------------------------------------------- | :------------------------------------------------------------------------------------------------------- | :-------------------------------------------------------------------------------------------------------------------- |
| **Disk Storage**                                 | Hundreds of individual `.jsonl` files (~50–200 MB uncompressed text).                                    | A single indexed `history.db` SQLite file (~10–30 MB total, compressed binary structure).                             |
| **Query Speed (DuckDB analytical SQL)**          | Scans & parses all text JSONL files every run via `read_json_auto`. Slows down linearly with file count. | B-Tree indexed binary scans via DuckDB `ATTACH 'history.db' (TYPE SQLITE)`. **Instant (sub-millisecond queries)**.    |
| **Report JSON Generation (`zr history report`)** | Parses every single historical test result ever recorded.                                                | Queries aggregated views directly (`SELECT * FROM flaky_summary WHERE total_runs > 1`).                               |
| **HTML Report Payload Size**                     | Embeds all 1,000–5,000 runs raw test rows (~25MB+ HTML file).                                            | Can query & embed **only the top N (e.g. 50–100) trend runs + aggregate summaries**, keeping HTML lightweight (~1MB). |

At **1,000 to 5,000 runs**, SQLite will remain **lightning fast** for DuckDB OLAP queries because indexed B-Trees eliminate table scans.

---

## 🔄 Impact on CI/CD Server & Workflow Persistence

Switching to SQLite simplifies CI/CD persistence:

### 1. Easy CI Artifact Caching & Storage

In GitHub Actions, GitLab CI, Jenkins, or CircleCI:

- Storing and retrieving **a single binary `history.db` file** via cache actions (`actions/cache`) is significantly faster and less error-prone than restoring thousands of individual JSONL files.
- **Example GitHub Actions step**:

  ```yaml
  - name: Restore Zen Reporter History DB
    uses: actions/cache@v4
    with:
      path: zen-report/history.db
      key: zen-history-${{ runner.os }}
  ```

### 2. Incremental Append Performance

- Instead of appending JSON lines across multiple `.jsonl` files or rewriting large JSON payloads, SQLite handles transactional inserts (`INSERT INTO runs ...`) atomically without lock contention or file corruption risks.

#### 3. Easy Remote Database / S3 Synchronization

- A single SQLite file can be easily uploaded/downloaded to/from Cloud Storage (S3 / GCS / Azure Blob) at the start/end of a CI pipeline:

  ```bash
  aws s3 cp s3://my-bucket/history.db ./zen-report/history.db
  # Run Playwright tests
  npx zr history report
  aws s3 cp ./zen-report/history.db s3://my-bucket/history.db
  ```

---

### 💡 Summary Recommendation

1. **Adopt SQLite (`history.db`) for long-term storage**: Use SQLite as the single-file relational store for all historical runs, test cases, and execution metrics.
2. **Use DuckDB SQLite extension for analytics**: Connect DuckDB to `history.db` (`ATTACH 'history.db' AS history (TYPE SQLITE)`) to run fast aggregate queries for flaky test detection, regression tracking, and trend generation.
3. **Window the HTML report export**: Keep exported `history.json` (embedded in `index.html`) bounded to the **last 30–50 runs + aggregate tables**, while `history.db` retains full historical depth (1,000+ runs).

When window slicing `history.db` for HTML report embedding vs. full historical data analysis, **pagination** and **CSV export** behave differently depending on whether you are viewing a static HTML report or running in CLI/server mode (`npx zr show`):

---

### 1. 📄 How Pagination & CSV Export Work in Static Single-File HTML Reports

In a static HTML file (where there is no live backend/server listening to SQL queries):

- **Pagination**:
  - **Windowed Data in Memory**: The embedded `history.json` contains a bounded subset (e.g. the last 50 or 100 runs + pre-calculated global aggregate tables for Flaky, Slowest, and Regressions).
  - The frontend UI ([DataTable.tsx](file:///home/arpan/CodePlay/zen-reporter/src/components/shared/DataTable.tsx)) paginates across this embedded dataset client-side (e.g., 10 rows per page across 5 pages).
  - **Result**: The UI stays super fast and light without embedding 10,000+ raw test rows into a massive 50MB HTML file.

- **CSV Export**:
  - **Export Current View (Default)**: Clicking "Export CSV" in the UI exports all records currently available in the loaded `history.json` dataset ([exportToCsv.ts](file:///home/arpan/CodePlay/zen-reporter/src/lib/exportToCsv.ts)).
  - **Export Full Historical CSV via CLI**: If an engineer needs complete raw historical CSV dumps across all 5,000+ runs stored in `history.db`, they run the CLI command:

    ```bash
    npx zr history export --format=csv --out=all-history.csv
    ```

---

### 2. ⚡ How Pagination & CSV Export Work in Hosted / Dashboard Mode (`zr show`)

When running `npx zr show` or hosting Zen Reporter on a dashboard server:

- **SQL-Based Server Pagination (OFFSET / LIMIT)**:
  - Instead of embedding static JSON into the page, the frontend requests data via API endpoints backed by DuckDB querying `history.db`:

    ```sql
    SELECT * FROM history_runs
    ORDER BY started_at DESC
    LIMIT 20 OFFSET 40;
    ```

  - Only 20 rows are transferred over the wire per page request. Page switches load instantly regardless of whether `history.db` contains 500 or 50,000 runs.

- **Streaming Full CSV Export**:
  - Clicking "Export CSV" makes an API call to the backend endpoint (e.g. `/api/export/history.csv`).
  - DuckDB streams the CSV result directly from `history.db` using DuckDB's native CSV writer:

    ```sql
    COPY (SELECT * FROM history_runs ORDER BY started_at DESC)
    TO 'export.csv' (HEADER, DELIMITER ',');
    ```

---

### 📊 Summary Architecture Comparison

| Feature        | Static HTML Report (Windowed)                | Server / Hosted Dashboard (`zr show`)   | CLI Command (`zr history export`)                    |
| :------------- | :------------------------------------------- | :-------------------------------------- | :--------------------------------------------------- |
| **Data Scope** | Last N runs (e.g. 50) + Global aggregates    | Entire database (1,000–5,000+ runs)     | Entire database (1,000–5,000+ runs)                  |
| **Pagination** | Client-side memory array slice               | Server SQL `LIMIT ? OFFSET ?`           | N/A (terminal / file output)                         |
| **CSV Export** | Exports loaded window array to Blob download | Streams full SQL `COPY TO CSV` endpoint | Generates complete `.csv` directly from `history.db` |

For Zen Reporter, because it is distributed as a lightweight CLI package (`npm i -D @arpanp/zen-reporter`), **minimizing binary footprint and startup overhead is paramount**.

Here are the top options evaluated for Zen Reporter:

---

### 🏆 Option 1: Native Node.js `http` Module (Zero Dependencies) — **BEST & RECOMMENDED**

Since Zen Reporter runs on Node.js (>= 18.0.0), Node’s built-in `http` / `node:http` module provides everything needed to build lightweight REST API endpoints.

- **Why it's the best fit**:
  - **0 Bytes added to install size**: No additional `node_modules` dependencies needed.
  - **Instant Startup**: Zero framework initialization overhead when running `npx zr show`.
  - **Simple Routing**: Only 3–4 endpoints are required (`GET /api/history/runs`, `GET /api/history/flaky`, `GET /api/export/csv`).

```ts
import http from 'node:http';
import { URL } from 'node:url';

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url!, `http://${req.headers.host}`);

  if (url.pathname === '/api/history/runs') {
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '20');
    const offset = (page - 1) * limit;

    const data = await queryRunsFromDb({ limit, offset });
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify(data));
  }
});
```

---

### 🥈 Option 2: `Hono` (Ultralight Web Framework) — **BEST IF A FRAMEWORK IS DESIRED**

If routing, input validation, and typed API responses become complex, **Hono** (via `@hono/node-server`) is by far the best modern lightweight framework choice.

- **Why Hono**:
  - **Tiny Bundle**: Weighs under **15 KB** (compared to Express which is 2+ MB with dozens of transitive dependencies).
  - **Web Standard Request/Response**: Uses native Web Fetch APIs.
  - **RPC & Type Safety**: Shares TypeScript endpoint types directly between server and frontend React client.

```ts
import { Hono } from 'hono';
import { serve } from '@hono/node-server';

const app = new Hono();

app.get('/api/history/runs', async (c) => {
  const page = Number(c.req.query('page') || 1);
  const limit = Number(c.req.query('limit') || 20);
  const offset = (page - 1) * limit;

  const runs = await db.queryRuns(limit, offset);
  return c.json({ page, limit, data: runs });
});

serve({ fetch: app.fetch, port: 3000 });
```

---

### ❌ What NOT to Use for Zen Reporter

1. **Express.js**: Heavyweight, legacy callbacks, adds 40+ sub-dependencies to `node_modules`.
2. **Fastify**: Excellent for large enterprise microservices, but adds unnecessary complexity and overhead for a CLI test report tool.
3. **Next.js / Remix**: Overkill; Zen Reporter relies on Vite singlefile bundles for static HTML report portability.

---

### 3. 🖼️ Historical Attachments & Multi-Run Browsing Plan

To allow users to browse **any past historical report** and inspect its **attachments** without needing hundreds of individual `report.json` files:

#### A. Database Schema (`history_attachments`)

Add a normalized `history_attachments` table to `history.db` (`schema.ts`):

```sql
CREATE TABLE IF NOT EXISTS history_attachments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  run_id TEXT NOT NULL,
  test_file TEXT NOT NULL,
  test_title TEXT NOT NULL,
  name TEXT NOT NULL,
  content_type TEXT,
  file_path TEXT NOT NULL,       -- Relative path, e.g. "attachments/run-104_att0_screenshot.png"
  body_text TEXT,               -- Truncated text/log snippet (<64KB) if text attachment
  created_at TEXT NOT NULL,
  FOREIGN KEY (run_id) REFERENCES history_runs(run_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_hist_att_run ON history_attachments(run_id);
```

#### B. Attachment Storage & Retention

- **File System**: Binary attachments (screenshots, videos, trace files) are saved under `<outputDir>/attachments/` with run-prefixed names (e.g. `<runId>_<testId>_<attIdx>_<filename>`).
- **Pruning**: When `maxRuns` retention cleans up old runs in `history.db`, an automatic cleanup hook scans `<outputDir>/attachments/` and removes unreferenced files.
- **SaaS / Remote Mode**: The reporter uploads attachments to S3/R2/GCS via presigned URLs and records the object key or public URL in `history_attachments.file_path`.

#### C. User Run Switching (UI / Dashboard)

1. **Top Navigation Run Selector**:
   - The UI header features a dropdown listing recent runs populated from `history.json` / `history_runs`.
   - Selecting a run updates the active run context and URL query parameter (`?runId=<run_id>`).
2. **From the History Tab Table**:
   - Every row in the "Runs History" table includes a `"View Report ↗"` action that loads that run's test suite and failures.
3. **Serving Historical Runs**:
   - **In CLI Server (`npx zr show`) / SaaS Server**: Adds a fast REST route `GET /api/runs/:runId` that queries `history_test_cases` and `history_attachments` to reconstruct that run on demand.
   - **In Static HTML (`index.html`)**: The embedded `history.json` supplies the run summary and test failure details, and the browser resolves media via `<img src="./attachments/<runId>_..." />`.

---

### Summary Recommendation Matrix

| Solution                  | Install Size Added | Node.js Version | Best For                                                 |
| :------------------------ | :----------------- | :-------------- | :------------------------------------------------------- |
| **Node.js `http` module** | **0 KB**           | `>=18.0.0`      | **CLI commands & lightweight report server (`zr show`)** |
| **Hono**                  | **~15 KB**         | `>=18.0.0`      | **Typed API endpoints & clean routing middleware**       |
