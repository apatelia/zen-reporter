# Project Structure

```text
zen-reporter/
├── src/
│   ├── components/
│   │   ├── dashboard/
│   │   │   ├── FileSummary.tsx        # File breakdown table with status counts
│   │   │   ├── Overview.tsx           # Dashboard layout & high-level stats
│   │   │   ├── PassRateRing.tsx       # Radial pass rate indicator
│   │   │   ├── ProjectBarCharts.tsx   # Per-project test status bar charts
│   │   │   ├── QuickStats.tsx         # KPI summary counters
│   │   │   └── SummaryCard.tsx        # Reusable metric card with icons
│   │   ├── failures/
│   │   │   ├── FailureList.tsx        # List view for failed & timed-out tests
│   │   │   └── FailuresSection.tsx    # Failures tab container with search & filters
│   │   └── suites/
│   │       ├── MultiSelectFilter.tsx  # Multi-select dropdown filter component
│   │       ├── SuiteView.tsx          # Tree view container for test suites
│   │       ├── SuitesSection.tsx       # Suites tab container with search & expand all
│   │       ├── TestCaseCard.tsx       # Individual test case card with header toggle
│   │       ├── TestCaseDetail.tsx     # Expanded test step execution & error stack
│   │       └── TestSuiteNode.tsx      # Collapsible suite node for nested describes
│   ├── lib/
│   │   ├── dataProcessor.ts         # Raw data conversion & package manager detector
│   │   ├── reporter.ts              # Playwright Reporter implementation (ZenReporter)
│   │   ├── tagColors.ts             # Deterministic HSL color generator for tags
│   │   ├── types.ts                 # TypeScript interfaces for report data models
│   │   └── utils.ts                 # Suite tree builders, step converters & ANSI cleaner
│   ├── App.tsx                      # Root component with tab routing & filter state
│   ├── app.css                      # Design system CSS & dark mode tokens
│   ├── main.tsx                     # React application entry point
│   ├── vite-env.d.ts                # Vite type declarations
│   └── vite-plugin-inject-data.ts   # Vite plugin to inline report.json into HTML
├── scripts/
│   ├── cli.ts                       # CLI executable (npx zen-reporter show)
│   └── generate_report.ts           # Standalone HTML build script
├── zen-report/
│   ├── index.html                   # Generated standalone single-file HTML report
│   └── report.json                  # Processed test execution JSON data
├── tests/                           # Playwright E2E test files
├── playwright.config.ts             # Playwright test configuration
├── vite.config.ts                   # Vite single-file bundling configuration
└── package.json
```

---

## Data Flow

```text
               Playwright Test Execution
                         │
                         ▼
        ZenReporter (src/lib/reporter.ts)
  Hooks: onBegin ➔ onTestBegin ➔ onTestEnd ➔ onEnd
  Collects test metadata, describe hierarchy, steps & errors
                         │
                         ▼
              <outputDir>/report.json
    Structured JSON dataset containing testRun & summary
                         │
                         ▼
      Report Pipeline (scripts/generate_report.ts)
  Processes raw test data (src/lib/dataProcessor.ts)
  Triggers Vite single-file compilation (npx vite build)
                         │
                         ▼
   Vite Data Injector (src/vite-plugin-inject-data.ts)
  Inlines report.json into <script id="report-data"> tag in HTML
                         │
                         ▼
        <outputDir>/index.html (Single-File Report)
  Fully self-contained interactive React web application
                         │
                         ▼
       CLI Report Server (npx zen-reporter show)
  Launches Playwright web server to serve the report locally
```
