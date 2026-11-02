# Cross-Run History Persistence — Design Plan

> This is the design for making Zen Reporter's History / Flaky / Regressions / Trends tabs survive across separate CI runs and shared CI runners, in addition to the local-only design currently implemented.

## 1. Current design (grounded in the code)

### What already works locally

- The reporter (`src/lib/reporter.ts`) appends one JSONL record per test case to `<outputDir>/runs/<runId>.jsonl` via `writeRunHistory()`.
- Each record is produced by `flattenRunRows()` in `src/lib/runHistory.ts`: a single row per test case carrying run-level fields (`run_id`, `run_name`, `started_at`, `run_duration_ms`, `run_passed`, …) plus per-test fields (`file`, `suite`, `title`, `status`, `duration_ms`, `error_message`, `error_stack`, `tags`, …).
- History is aggregated server-side by the CLI (`bin/zen-reporter.js`) using DuckDB `read_json(...)` over the glob `<outputDir>/runs/*.jsonl`. Queries are in `RUNS_SQL`, `FLAKY_SQL`, `REGRESSIONS_SQL`, `SLOW_SQL`, `TREND_SQL`, `PROJECT_DURATIONS_SQL`, `FILES_SQL`, `FILES_SUMMARY_SQL`, `TESTS_SQL`.
- `zr history report` (`generateHistoryReport`) rebuilds `<outputDir>/history.json` and re-injects it into `<outputDir>/index.html`.
- `refreshHistory()` in the reporter calls `zr history report` automatically after each run so the just-finished run is included.

### Why it does not work cross-run in CI

1. **Ephemeral runners.** Each CI run starts on a fresh machine; `<outputDir>/runs/` is wiped every run, so there is no longer than one-run window.
2. **Non-deterministic run identity.** `buildRunId()` (`runHistory.ts`) derives the id from the ISO start time + a slugified `testRunName` (+ shard suffix). Two runs at the same minute collide. The suffix guard (`-2`, `-3`) only disambiguates _on the same machine_.
3. **Local run counting.** `{N}` in `testRunName` is replaced by a count of local `.jsonl` files (`resolveConfig`, reporter.ts). Across runners that count is always 1.
4. **Local-only store.** Nothing exists that archives `runs/` to durable, shared, tenant-scoped storage.

## 2. Design goals

- **Idempotent uploads:** uploading the same run twice never creates duplicates.
- **Durable, shared storage:** history survives across runners, jobs, and days.
- **Tenant isolation:** runs are namespaced so different projects/repos never collide.
- **Minimal reporter change:** preserve the local single-file workflow; add a durable-history path alongside it.
- **Security-first:** stored records contain `error_message`, `error_stack`, `stdout`, `stderr`, source snippets — treat as sensitive.

## 3. Storage layers

Three tiers, from least to most infrastructure. Each builds on the JSONL record format already shipped in `runHistory.ts`, so **no record schema change is required** for tiers A and B.

### Tier A — Archive/restore a JSONL bundle (local-first, no backend)

Good if you only need history _within a repo/team_ without operating a service.

- The reporter/CLI writes the same `runs/*.jsonl` locally.
- CI archives the `runs/` directory (and/or a zipped `history.json` + `report.json`) as a CI artifact, keyed on a **stable run key** (e.g. the CI run ID or a slug + branch).
- On the next run, CI restores that artifact into `<outputDir>/runs/` before the tests run, so the local DuckDB pipeline picks it up unchanged.

- **Pros:** zero new infrastructure; works with the existing `zr history report` pipeline.
- **Cons:** history is scoped per runner-provider cache; de-dup and multi-tenancy are manual; still needs a way to disambiguate identical local run ids.

### Tier B — Shared object store + history sync client (recommended MVP)

A lightweight backend that stores runs and answers a history API.

- **Upload:** after the local run, the CLI (or a small `zr history sync --up` helper) uploads each new `runs/*.jsonl` to object storage (S3/GCS/Azure Blob) in a **tenant key**: `zen-reporter/runs/{org}/{project}/{runKey}.jsonl`.
- **Storage schema:** keep the exact `flattenRunRows()` JSONL shape as stored objects. Bucket names become _logical_ orgs (do not enforce multi-tenancy by bucket).
- **History read API:** `GET /{tenant}/history.json` returns the aggregated data (equivalent to what `generateHistoryReport` produces). A dedicated aggregation service rebuilds it from the uploaded JSONL, rather than each client re-running DuckDB against every historical record.
- **Report hydration:** on demand (or at the end of a run) the CLI downloads the tenant's `history.json` and re-injects it into the local `index.html`, so the History/Flaky/Regressions tabs show real trends even on a fresh runner.

- **Pros:** real cross-run history, scales independently of the reporter, reuse of the existing record format.
- **Cons:** requires object storage + a small aggregator/service + an API contract.

### Tier C — Full hosted SaaS platform

Persist runs in a relational DB (Postgres) for fast queries/authz, archive JSONL + attachments in object storage, serve each report at a public URL, run aggregation on a queue, and front with a CDN. See the SaaS question answer; this plan's layers A/B are the prerequisite for C.

## 4. Run identity & de-duplication

The deterministic `buildRunId` collides across runners and across runs at the same minute. Introduce an **explicit run key** rather than relying on wall-clock time:

- Add a config option `runId` (or `runToken`), e.g. `GITHUB_RUN_ID`, `git revision + build number`, or any CI-provided unique string. When set, `buildRunId()` appends it: `base + '__' + slugify(runId)`.
- The CLI/upload helper computes a **stable de-dup key** from that value and skips uploading the same key twice.
- Keep `buildRunId` backward compatible: if no `runId` is supplied, retain the existing ISO + slug + shard behavior.

Rationale: a CI build number is unique per execution, giving idempotent uploads without a round-trip to a server.

## 5. Data model changes (minimal)

Only the CLI/CLI-upload path changes; the DuckDB queries and `history.json` consumed by the UI are unchanged.

- **Reporter (`src/lib/reporter.ts`):** pass `runId`/`runToken` into `buildRunId()` (in `writeRunHistory`) and `resolveConfig`.
- **`runHistory.ts`:** accept an optional run key in `buildRunId`.
- **New CLI subcommand** (Tier B): `zr history sync` with `--up`/`--down` flags, reading `PW_REPORTER_OUTPUT` and env vars (`ZEN_REPORTER_API_URL`, `ZEN_REPORTER_API_KEY`, `ZEN_REPORTER_TENANT`, `ZEN_REPORTER_RUN_ID`).
- **No change** to `flattenRunRows()`, the DuckDB SQL, or `history.json` — preserving full backward compatibility.

## 6. PII / security handling

Stored records contain `error_message`, `error_stack`, `stdout`, `stderr`, and source-code snippets, which can include secrets, tokens, or PII.

- **Transport:** HTTPS/TLS for all uploads and history downloads; reject plain HTTP for hosted URLs.
- **At rest:** server-side encryption on the object store; **KMS-managed keys** for the hosted (Tier C) product.
- **Auth:** per-tenant API keys or short-lived tokens; short TTLs for public report URLs.
- **Sensitive-value masking:** add an optional `mask` list of regexes (env var or config) applied at upload time to `error_message`/`error_stack`/`stdout`/`stderr` _before_ the record leaves the CI runner — before it is stored.
- **Retention:** configurable retention on stored runs (delete old JSONL beyond N days / N runs) to limit blast radius and storage cost.
- **Not PII in the record:** the test `title`, `suite`, `file`, and `tags` are metadata; ensure secrets are never intentionally asserted/logged by test code, and prefer masking over trusting consumers.

## 7. CI integration points

- **Upload** after the test step, not before (so the just-finished run is included) — but download history _before_ report generation if the in-run history view is desired.
- **De-dup** keyed on the stable run id prevents double-counting on re-runs/retries.
- **Secrets** for API auth must be provided via CI secrets, never committed to `playwright.config.ts`.

## 8. Recommended rollout

1. Add the `runId`/`runToken` option + `buildRunId` change (enables idempotent de-dup for all tiers).
2. Ship **Tier A** guidance: archive/restore `runs/` as a CI artifact (works with today's pipeline, no backend).
3. Add `zr history sync` + **Tier B** (object store + read API + aggregation service).
4. Promote to **Tier C** (hosted platform) only once authz, billing, and CDN are in place.
