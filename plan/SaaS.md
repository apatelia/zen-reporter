# SaaS

No CI workflows exist. Let me check the vite reporter config and the `.playwright` directory to understand how reports are served.

I've now got a thorough understanding of the architecture. Let me verify one detail about how attachments are handled in the report, since that's key to both CI artifacts and multi-tenancy.

I have enough to answer both questions precisely. Here's my analysis grounded in your code.

---

## What Zen Reporter is (grounding my analysis)

It's a **stateless, client-rendered, file-based** Playwright reporter:

- `src/lib/reporter.ts` hooks `onBegin → onTestBegin → onTestEnd → onEnd`.
- On `onEnd` it writes `<outputDir>/report.json`, optionally appends a JSONL record to `<outputDir>/runs/*.jsonl`, then splices `report.json` into a **pre-built static HTML template** (`dist/index.html`) as a JSON `<script>` blob and writes a single-file `<outputDir>/index.html`.
- The report is a self-contained static React app served locally via `npx zr show` (which just runs `playwright show-report`).
- History/insights (flaky, regressions, trends) are computed by a local CLI (`bin/zen-reporter.js`) running **DuckDB** queries over the JSONL files.

Everything is local disk. There is no server, database, user accounts, or network component.

---

## Question 1: Is it suitable for CI/CD in its current form?

**Partially — it will _work_ in CI, but it's not _designed_ or _documented_ for it, and the history feature specifically breaks across ephemeral CI runners.**

### What already works fine in CI

- **It's a static artifact.** The output is a static `index.html` (plus a `runs/` dir and `attachments/` dir) — trivially uploadable as a CI artifact (GitHub Actions `upload-artifact`, etc.).
- **It doesn't hijack the build.** A Playwright reporter can't change the process exit code, and yours doesn't. CI pass/fail is correctly owned by Playwright itself, so failing tests still fail the build. ✓
- **It's already non-TTY aware.** `consoleProgress: 'auto'` correctly falls back to `dot` mode when stdout isn't a TTY (the CI case), so logs won't get stuck on progress bars.
- **The optional DuckDB dependency is genuinely optional** (`peerDependenciesMeta` marks it optional; `auto` mode catches the missing package and skips history with a warning), so it won't hard-fail a fresh CI agent.

### What's missing / risky

| Gap                                               | Why it matters in CI                                                                                                                                                                                                                                                                                                                                                         |
| ------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **History won't survive across CI runs**          | The JSONL archive lives in `<outputDir>/runs/`, and each CI runner is typically ephemeral (wiped every run). So "History," "Flaky," and "Trends" tabs show only the current run. There's **no mechanism to persist history** (no shared store, no cloud sync). To get cross-run history you'd manually archive/restore `runs/` as a CI cache — undocumented and manual.      |
| **Report is _not_ truly single-file for visuals** | Text attachments are inlined, but **binary attachments (screenshots/videos) are copied to a relative `attachments/` folder**, and `index.html` references them with `./attachments/...` (see `onTestEnd`, lines 490–556). So to actually view the report you must upload **both** `index.html` and the `attachments/` dir. The README's "single-file" claim overstates this. |
| **No CI documentation**                           | There's no README section, example workflow, or snippet for GitHub Actions/GitLab CI/Jenkins — how to upload artifacts, how to make history persist, how to post a summary.                                                                                                                                                                                                  |
| **No PR/Slack reporting**                         | `zr summary` already emits Markdown (good seed), but there's no opinionated "post failed-test summary to a PR comment or Slack" integration for CI.                                                                                                                                                                                                                          |
| **`execSync` side effects during `onEnd`**        | `onEnd` runs an inline vite build if no template is found (lines 762–780) and runs `zr history report` (line 816). Both are wrapped in try/catch so they won't break the run, but they add latency and noise to CI runs, and the vite build requires dev-deps present in the agent.                                                                                          |

**Bottom line for Q1:** It's _usable_ in CI as a static artifact, but you should (a) add a CI guide, (b) document/ship the `attachments/` dir with the artifact, and (c) add cross-run history persistence (a cacheable artifact, a shared bucket, or a hosted endpoint) before calling it _CI-ready_.

---

## Question 2: What would it take to convert this into a SaaS?

Your current architecture is actually well-positioned for this in one important way: **the report is a static client app fed by data files.** You don't need to rebuild the UI. The work is entirely about adding a **server layer** around that static app. Here's the landscape:

### 1. Data ingestion API

Instead of writing `report.json`/`runs/*.jsonl` locally, consumers upload. Options, in order of least→most invasive:

- Accept the whole `zen-report/` folder or the single `index.html` (simplest — your static app already renders from `report.json`/`history.json`).
- Accept the JSONL runs and regenerate `report.json` server-side.

### 2. Multi-tenancy & auth

This is the biggest _new_ surface — you currently have zero of it.

- User accounts (OAuth, SSO), organizations/projects (tenants), and RBAC.
- Tenant-scoped access control over all stored runs.

### 3. Storage & hosting

- **Relational metadata (Postgres)**: Runs, suites, test results, flaky analytics, and attachment metadata (`history_attachments`).
- **Object storage (S3/Cloudflare R2/GCS)**: Stores raw screenshots, video replays, trace archives, and HTML report backups with presigned upload URLs.
- **CDN**: Public URLs for reports and media assets with tenant-scoped signed cookies or tokens.
- **Attachment Retention**: Automated S3 lifecycle rules to transition old traces/videos to cold storage or expire them after 30–90 days.

### 4. Server-side analytics engine

The DuckDB aggregation (`bin/zen-reporter.js`, lines 521–584) currently runs synchronously in the reporter process. In SaaS you'd move this to a **backend worker/queue**:

- Keep DuckDB as an embedded _analytical_ engine per tenant (it fits the OLAP queries well), but run it server-side on demand.
- For very large datasets, client-side filtering in the single-file app won't scale — you'd want server-side search/pagination.

### 5. Async report processing

`onEnd` does generation synchronously (spawns vite). At scale you'd decouple this into a **job queue + workers** so a heavy run doesn't block the reporter.

### 6. Billing / metering

Stripe + metering on the SaaS-relevant dimensions: number of runs, stored storage, MAUs, or analytics queries.

### 7. First-class CI/CD integration (complements Q1)

A hosted reporter naturally wants: a small upload client / official GitHub Action that uploads results as an artifact _and_ to your platform, keeps history cross-run in your DB, and optionally posts summaries to PRs/Slack. This is what turns "static artifact" into "SaaS loop."

### Recommended sequencing (least-risk path)

Because your report is static, the leanest SaaS is achievable:

1. **Upload API + S3 + auth** → host a per-run URL. (MVP)
2. **Persist `runs/*.jsonl` server-side + run DuckDB history on demand** → fixes the CI history problem _and_ is your SaaS's core value.
3. **Official CI Action + PR/Slack summaries** → pulls from CI ecosystems.
4. **RBAC, billing/metering, CDN, tenant isolation** → mature the product.

---

Want me to sketch a concrete implementation plan for any of these — e.g., a **cross-run history persistence design** (to close the biggest CI gap now) or an **MVP SaaS ingestion + hosting design**? I can also add a `docs/ci-usage.md` with a working GitHub Actions workflow reflecting the gaps above.
