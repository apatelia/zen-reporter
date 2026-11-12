# Running Tests in Shard Mode with Zen Reporter

When your test suite grows, running tests in parallel across multiple shards (machines or CI containers) speeds up execution significantly.

Because Playwright shards execute as separate, isolated processes, each shard only sees a subset of the test suite. To generate a single consolidated Zen Report, unified execution history, and merged `summary.html`, Playwright's built-in **Blob Reporter** and **`merge-reports`** CLI command are used.

---

## Why Shards Need to be Merged

If you run Playwright shards directly with `@arpanp/zen-reporter`:

- Each shard runs independently and overwrites the previous shard's `zen-report/index.html` and `zen-report/summary.html`.
- Each shard creates its own separate run entry in the execution history (e.g. `Run #1` with 50 tests and `Run #2` with 50 tests), instead of a single consolidated `Run #1` with 100 tests.

By using Playwright's **Blob Reporter** during shard execution and running **`npx playwright merge-reports`** at the end:

- Playwright stitches all shards, browser projects, and attachments together into a single logical run.
- Zen Reporter's `{N}` run counter increments only once.
- A single consolidated entry is recorded in execution history with the full test count.
- Both `index.html` and `summary.html` show the unified dashboard.

---

## CI/CD Setup (GitHub Actions Example)

This is the standard, recommended pattern for running sharded tests in CI:

1. Shard jobs run tests using `--reporter=blob` and upload their blob artifacts.
2. A subsequent merge job downloads all blobs and runs `npx playwright merge-reports` pointing to your `playwright.config.ts`.

```yaml
name: Playwright Tests
on: [push, pull_request]

jobs:
  test:
    name: Run Shard ${{ matrix.shardIndex }} of ${{ matrix.shardTotal }}
    runs-on: ubuntu-latest
    strategy:
      fail-fast: false
      matrix:
        shardIndex: [1, 2, 3, 4]
        shardTotal: [4]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 24
          cache: 'npm'

      - run: npm ci
      - run: npx playwright install --with-deps

      # Run shard with blob reporter
      - name: Run Playwright tests on Shard
        run: npx playwright test --shard=${{ matrix.shardIndex }}/${{ matrix.shardTotal }} --reporter=blob

      # Upload blob artifact
      - name: Upload Blob Report
        if: ${{ !cancelled() }}
        uses: actions/upload-artifact@v4
        with:
          name: blob-report-shard-${{ matrix.shardIndex }}
          path: blob-report/*.zip
          retention-days: 1

  merge-reports:
    name: Merge Shards & Generate Zen Report
    if: ${{ !cancelled() }}
    needs: [test]
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 24
          cache: 'npm'

      - run: npm ci

      # Download all shard blobs into a single folder
      - name: Download Shard Blob Reports
        uses: actions/download-artifact@v4
        with:
          path: all-blob-reports
          pattern: blob-report-shard-*
          merge-multiple: true

      # Merge all blobs into Zen Reporter using your existing playwright.config.ts
      - name: Generate Consolidated Zen Report
        run: npx playwright merge-reports -c playwright.config.ts ./all-blob-reports

      # Upload the consolidated Zen Report
      - name: Upload Zen Report
        uses: actions/upload-artifact@v4
        with:
          name: zen-report
          path: zen-report/
          retention-days: 30
```

---

## Running Shards Locally

When running shards sequentially on the same machine, note that Playwright cleans the `blob-report` output directory by default between runs. To prevent shard 2 from erasing shard 1's blob, output each shard into a separate subfolder using the `PLAYWRIGHT_BLOB_OUTPUT_DIR` environment variable:

```bash
# 1. Clean previous blobs
rm -rf all-blob-reports

# 2. Run Shard 1
PLAYWRIGHT_BLOB_OUTPUT_DIR=all-blob-reports/shard-1 npx playwright test --shard=1/2 --reporter=blob

# 3. Run Shard 2
PLAYWRIGHT_BLOB_OUTPUT_DIR=all-blob-reports/shard-2 npx playwright test --shard=2/2 --reporter=blob

# 4. Merge all shards into Zen Reporter
npx playwright merge-reports -c playwright.config.ts ./all-blob-reports
```

> **Tip:**
> `npx playwright merge-reports` automatically scans all nested directories inside `./all-blob-reports` to locate and combine every `.zip` blob file.

---

## Viewing the Merged Report

Once the merge command completes, view the consolidated report and history dashboard:

```bash
npx zr show
```
