# `@arpanp/zen-ui` — Interactive Report Dashboard

> Package: `packages/ui` · Deps: `@arpanp/zen-core` · Build: Vite (single-file HTML bundle)

The React dashboard that renders Zen Reporter's interactive HTML report. It
ships as a **self-contained single-file `dist/index.html`** bundle: all
JavaScript, CSS, and the report/history datasets are inlined, so the generated
report works offline with zero dependencies.

---

## Entry & Build

```text
packages/ui/
├── index.html              # Vite HTML entry
├── vite.config.ts          # Single-file bundling config
├── src/
│   ├── main.tsx            # React application entry point
│   ├── App.tsx             # Root component: theme loading, version header & tab routing
│   ├── app.css             # Design system CSS (theme palettes, WCAG tokens, dark mode)
│   ├── vite-env.d.ts
│   ├── assets/
│   ├── hooks/
│   │   └── useKeyboardShortcuts.ts   # Global keyboard shortcut handling
│   └── utils/
│       └── clipboard.ts              # Clipboard copy helper
```

```bash
npm run dev   -w @arpanp/zen-ui   # Vite dev server
npm run build -w @arpanp/zen-ui   # cross-env ZEN_REPORTER_DATA_FREE=true vite build
```

The `ZEN_REPORTER_DATA_FREE=true` build flag produces a data-free template
bundle. The **reporter** package copies this template into its own `dist/`
(`build:template`) and inlines `report.json` / `history.json` into a
`<script id="report-data">` tag when generating a report.

---

## Tab Layout & Component Tree

```text
src/components/
├── dashboard/             # Overview tab
│   ├── Overview.tsx                    # Main Overview layout
│   ├── TestResultsHero.tsx             # Header summary metrics & run metadata
│   ├── PassRateRing.tsx                # Radial pass rate chart (dual-tone clean/flaky arcs)
│   ├── ProjectParityScorecard.tsx      # Cross-project stability & execution parity scorecard
│   └── ExecutionTimingEfficiencyCard.tsx
├── failures/              # Failures tab
│   ├── FailuresSection.tsx             # Failure view with search & grouping
│   └── FailureList.tsx                # Failure lists with trace & error details
├── files/                 # Spec Files tab
│   ├── FilesSection.tsx
│   ├── FileSummary.tsx
│   └── FileMetricsSection.tsx
├── history/               # History tab
│   ├── HistorySection.tsx              # Main History tab container
│   ├── HistoryRunsTableSection.tsx     # Test runs audit log table
│   ├── HistoryFileSection.tsx          # Spec files execution history breakdown
│   ├── HistoryTestSection.tsx          # Individual test case history breakdown
│   └── HistoryGuides.tsx               # Interactive guide modals
├── insights/              # Insights tab
│   ├── InsightsSection.tsx
│   ├── ProjectLatencySpreadChart.tsx
│   ├── ProjectFlakyRateChart.tsx
│   ├── FlakyTestsTableSection.tsx      # Paginated flaky tests table + CSV export
│   ├── RegressionsTableSection.tsx     # Paginated regressions table + CSV export
│   ├── SlowestTestsTableSection.tsx    # Paginated slowest tests table + CSV export
│   └── InsightsGuides.tsx
├── layout/                # Navigation & app chrome
│   ├── Sidebar.tsx
│   ├── HeaderRunSwitcher.tsx           # Header run switcher dropdown
│   ├── ThemeControls.tsx               # Theme selector & dark mode toggle
│   └── ConfigGeneratorModal.tsx        # Interactive Playwright config generator
├── pagination/            # Centralized pagination
│   ├── PaginationFooter.tsx
│   ├── PageSizeControl.tsx
│   └── usePagination.ts
├── projects/              # Projects tab
│   ├── ProjectsSection.tsx
│   ├── ProjectsOverviewCards.tsx
│   ├── ProjectDetailCards.tsx
│   ├── ProjectBarCharts.tsx
│   ├── ProjectVolumeCoverageChart.tsx
│   └── ProjectsGuides.tsx
├── suites/                # Suites tab (tree view)
│   ├── SuitesSection.tsx
│   ├── SuiteView.tsx
│   └── TestSuiteNode.tsx
├── trends/                # Quality & duration trends tab
│   ├── TrendsSection.tsx
│   ├── PassRateTrend.tsx
│   ├── DurationTrend.tsx
│   ├── StepCategoryTrend.tsx
│   ├── TrendTick.tsx                   # SVG trend tick renderer & timestamp parser
│   ├── TrendsGuides.tsx
│   └── step-category/
│       ├── StepCategoryChart.tsx       # Recharts stacked bar chart
│       └── StepCategorySummaryCards.tsx # Ratio KPI summary cards
├── visual-regression/     # Visual regression diff viewer
│   ├── VisualDiffViewer.tsx            # Main diff modal / container
│   ├── SideBySideViewer.tsx
│   ├── ImageSliderViewer.tsx
│   ├── DiffHighlightViewer.tsx
│   └── ViewModeSelector.tsx
└── shared/                # Cross-tab shared components
    ├── test-case-detail/               # Decomposed Test Case Detail modal
    │   ├── TestErrorAlert.tsx
    │   ├── StepItem.tsx
    │   ├── TestStdOutput.tsx
    │   ├── TestAttachments.tsx
    │   ├── UniversalPreviewModal.tsx
    │   ├── AttemptTabSelector.tsx
    │   └── AttemptView.ts              # Attempt normalization & attachment helpers
    ├── BaseModal.tsx, DataTable.tsx, DateFilterControl.tsx, DatePicker.tsx, Kbd.tsx
    ├── GuideModal.tsx, LearnMoreButton.tsx, ShortcutsModal.tsx, InfoTooltip.tsx, StatusPill.tsx
    ├── SearchInput.tsx, MultiSelectFilter.tsx, TagCloudModal.tsx
    ├── StatCard.tsx, PassRateBadge.tsx, StatusCountBadge.tsx, TestCaseCard.tsx
    ├── TestCaseDetail.tsx, RunSwitcherModal.tsx, Toast.tsx
    ├── BackToTopButton.tsx, HistoryDisabledBanner.tsx, OfflineHistoryNotice.tsx
```

---

## Data Sources

- **Local (offline) mode:** `report.json` + `history.json` datasets inlined by
  the reporter into the single HTML file. All analytics are computed client-side
  using `@arpanp/zen-core` utilities.
- **Remote (server) mode:** heavy per-test details (steps, stdout/stderr,
  stack traces, attachment URLs) are lazy-loaded from
  [`@arpanp/zen-server`](server.md) (`GET /api/v1/runs/:runId/tests/:testId`).

Shared styling, status colors, and KPI math all come from
[`@arpanp/zen-core`](core.md) (`theme.ts`, `statsUtils.ts`, etc.).
