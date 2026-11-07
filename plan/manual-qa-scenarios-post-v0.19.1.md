# Manual QA Test Scenarios (Post-v0.19.1)

High-level manual test scenarios covering all features, updates, architectural migrations, and bug fixes implemented since `v0.19.1`.

---

## 1. Monorepo Architecture & Package Modularization

- **TypeScript compilation across workspaces**: Verify `npm run typecheck` passes across `@arpanp/zen-core`, `@arpanp/zen-reporter`, `@arpanp/zen-ui`, and root tests without path resolution errors.
- **Production package build chain**: Verify `npm run build` sequentially builds core (`tsc`), UI (`vite build`), and reporter template/library outputs.
- **Vite dev server with monorepo middleware**: Verify `npm run dev` serves `report.json`, `history.json`, attachments, and historical run APIs directly from the output directory.

---

## 2. SQLite History Backend & Migration

- **Default SQLite database creation**: Verify running a test suite with history enabled creates `history.db` in the report directory and writes the run without generating legacy `.jsonl` files in `runs/`.
- **Custom database path config**: Verify setting `history: { mode: 'local', dbPath: 'custom/path.db' }` creates and writes to the custom path.
- **Auto-migration from legacy `runs/` directory**: Verify initializing `SqliteHistoryStore` in a folder with existing `.jsonl` runs automatically migrates them into `history.db`.
- **Idempotent migration**: Verify repeated migrations skip runs that already exist in `history.db` without duplicate keys or errors.
- **Retention pruning with `maxRuns`**: Verify configuring `maxRuns: N` automatically prunes older runs, test cases, and orphan attachments from `history.db` when the threshold is exceeded.
- **Dynamic test run name increment (`{N}`)**: Verify setting `testRunName: "Unit Tests Run #{N}"` dynamically queries `history.db` and increments the run number consecutively on successive executions.
- **Git metadata persistence**: Verify `git_branch`, `git_commit`, and `git_commit_full` columns in `history_runs` correctly capture git branch and commit hash for each executed run.

---

## 3. Historical Run Browsing & Switcher Modal

- **Modal trigger & list rendering**: Verify clicking the "Switch Run" button in the top header opens `RunSwitcherModal` displaying recorded historical executions.
- **Active run indication**: Verify the currently viewed run is pinned to the top with an "Active" badge and a disabled "Viewing" button.
- **Switch execution run**: Verify clicking an inactive run or its "Switch ↗" button loads that run's dashboard, test suites, failures, attachments, and updates the URL to `?runId=<id>`.
- **Run search by run name & date**: Verify typing in the search input filters the list by name, month (short/long), day, or year.
- **Run search by git branch**: Verify searching by git branch name matches and filters runs belonging to that branch.
- **Run search by short and full commit hash**: Verify entering either a 7-character short commit hash or a 40-character full commit SHA matches and filters the corresponding run.
- **Branch & commit pill display**: Verify branch and commit pills render cleanly next to the run name with tooltip titles showing the full commit SHA.
- **Status badge rendering for 0 passed runs**: Verify runs with 0 passed tests and failures do not render an unstyled, discordant "0" badge stuck against the failure pill.
- **Pagination page sizing**: Verify the list displays 5 runs per page and fits completely without vertical scrollbars on standard laptop/desktop displays.
- **Pagination button focus ring clipping**: Verify focusing the "Next" button on the pagination footer does not clip its green active ring on the right border.

---

## 4. Navigation & "Latest Run" Header Action

- **"Latest Run" button visibility**: Verify the `[ ↺ Latest Run ]` button appears in the header only when viewing a past run or when a run fails to load, and remains hidden when on the latest run.
- **1-Click switch to latest run**: Verify clicking "Latest Run" removes `?runId=` from the URL, reloads the newest run report, shows a success toast, and hides the button.
- **Browser back & forward (`popstate`) navigation**: Verify using the browser Back and Forward buttons steps through previously viewed runs and re-fetches report data without needing a page refresh.
- **Direct navigation to root URL**: Verify refreshing or navigating to the root URL (without query params) loads the latest execution run.

---

## 5. Non-Existent / Invalid `runId` Error Handling

- **Invalid `runId` error state card**: Verify entering a non-existent or mistyped `?runId=invalid-id` displays a "Test Run Not Found" error card in the active tab rather than a broken or empty UI.
- **Header accessibility during error**: Verify the top bar header remains visible, showing the project title and active "Latest Run" / "Switch Run" buttons when an invalid `runId` is loaded.
- **Error state action buttons**: Verify clicking "Return to Latest Run" or "Choose From History" on the error card recovers from the error state.
- **Suppression of duplicate toast on direct URL entry**: Verify navigating directly to an invalid `runId` via URL does not pop up a redundant error toast alongside the error card.
- **API 404/500 error toast on user-initiated switch**: Verify an error toast with full, non-truncated error details appears if the server returns an error during a manual run switch.

---

## 6. Notification Toast Component

- **Top-center fixed positioning**: Verify notification toasts appear centered at the top of the viewport with distinct color accents for success and error.
- **Auto-dismiss timer**: Verify success toasts automatically dismiss after 3.2 seconds without getting stuck.
- **Hover pause**: Verify hovering over an active toast pauses the countdown timer, and un-hovering resumes dismissal.
- **Manual dismiss button**: Verify clicking the toast's "×" button immediately closes it.
- **Full multi-line error message wrapping**: Verify long error messages or run identifiers wrap onto multiple lines without being cut off by ellipsis (`...`).

---

## 7. Header Metadata & Consistency Across Past Runs

- **Persistent git branch & commit pills**: Verify switching to any historical run retains the git branch and commit pills in the header if git metadata was recorded for that run.
- **Commit SHA copy button**: Verify clicking the commit SHA pill copies the commit SHA to clipboard and gives visual confirmation ("Copied!").
- **Static project heading**: Verify the project title in the header remains an `<h1>` heading and does not morph into an interactive dropdown.

---

## 8. File Summary & CSV Export Enhancements

- **Active test run name pill**: Verify the "Test Results by File" table displays an informational badge showing the active run name before the "Export CSV" button.
- **Information badge styling**: Verify the active run badge is styled as a non-clickable informational pill rather than looking like an interactive button.
- **Run name in CSV export filename**: Verify exported CSV files include the sanitized active run name in the generated filename (e.g. `unit-tests-run-138-file-summary-<timestamp>.csv`).

---

## 9. Execution Runs History Table Enhancements

- **Branch column rendering**: Verify the "Execution Runs History" table displays a "Branch" column immediately after "Run Name" with styled branch pills.
- **Branch pill tooltip**: Verify hovering over the branch pill reveals a tooltip title showing the full branch name and commit hash.
- **Fallback for non-git runs**: Verify runs without git metadata display a clean `—` placeholder in the Branch column.
- **Multi-field search filtering**: Verify entering a branch name or commit hash (short 7-char or full 40-char SHA) in the search box filters the runs table accordingly.
- **CSV export branch column**: Verify exporting CSV from the Execution Runs History table includes the `Branch` column populated with branch names.

---

## 10. CLI & DuckDB 2.0 Integration

- **`zr show` historical run API**: Verify `npx zr show` serves the report and responds to `/api/runs` and `/api/runs/:runId` endpoints using `history.db`.
- **`zr history report` with DuckDB 2.0**: Verify running `npx zr history report` queries `history.db` through the DuckDB SQLite extension and generates an updated `history.json` embedded in `index.html`.
- **SQLite schema initialization and column migration order**: Verify running tests against an older pre-existing `history.db` (lacking columns such as `project` on `history_attachments`) gracefully executes schema column migrations before creating dependent indexes (`idx_hist_att_test_project`), successfully appending new runs without failure.

---

## 11. Phase 2: Remote History Store, SaaS Server & Presigned Uploads

- **Backend health check**: Verify running `curl -i http://localhost:3000/health` returns `200 OK` with JSON `{ "status": "ok" }`.
- **API Key authentication enforcement**: Verify sending requests to `/api/v1/runs` without an `Authorization` or `X-API-Key` header returns `401 Unauthorized`, and invalid keys return `403 Forbidden`.
- **Automatic default tenant initialization**: Verify starting the server logs `[zen-server] Ready. Tenant: default-tenant` and inserts the development key `zr_live_dev_api_key_12345` into the database if not present.
- **S3 Bucket auto-creation**: Verify that on server start, if the configured bucket (e.g. `zen-reports`) does not exist on the S3/S3Mock endpoint, the server creates it without error.
- **Remote run ingestion**: Verify executing tests with `history: { mode: 'remote', serverUrl: 'http://localhost:3000' }` streams the run, summary statistics, and test cases into PostgreSQL tables `runs` and `test_cases`.
- **Binary attachment upload via presigned URLs**: Verify test screenshots and videos produce presigned PUT URLs via `POST /api/v1/runs/:runId/attachments/presign` and are uploaded into the S3 bucket under the tenant's prefix (`<tenantId>/<runId>/...`).
- **Lazy loading of test details**: Verify expanding a test case in the UI triggers a fetch to `/api/v1/runs/:runId/tests/:testId` and displays the detailed steps, console stdout/stderr logs, and download links for media attachments.
- **Lazy loading spinner feedback**: Verify a spinner animation briefly appears inside the expand button while the heavy test details are being fetched over the network.
- **Paginated runs query (`GET /api/v1/runs`)**: Verify passing `?page=1&limit=10` returns the expected page slice along with pagination metadata (`total`, `totalPages`, `page`, `limit`).
- **PostgreSQL relational integrity**: Verify deleting a run in PostgreSQL cascades and deletes associated rows in `test_cases`, `test_details`, and `attachments`.
- **`zr history` analytical subcommands**: Verify running `npx zr history runs`, `flaky`, `regressions`, `slow`, `files`, and `tests` outputs CLI tables querying `history.db`.
