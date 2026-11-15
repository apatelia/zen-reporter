import GuideModal from '@/components/shared/GuideModal';

export type ProjectModalType =
  | 'status-breakdown'
  | 'volume-coverage'
  | 'duration-benchmark'
  | 'project-flaky-rate'
  | 'project-health'
  | null;

interface ProjectsGuidesProps {
  activeModal: ProjectModalType;
  onClose: () => void;
}

/**
 * Renders the Projects tab guide modals for status breakdown, test volume coverage,
 * duration spread benchmark, flaky retry rates, and project health metrics.
 * @param activeModal - Identifier of the currently open guide modal, or null when no modal is open.
 * @param onClose - Handler that closes the open guide modal.
 * @returns The rendered guide modals.
 */
export default function ProjectsGuides({ activeModal, onClose }: ProjectsGuidesProps) {
  return (
    <>
      {/* 1. Status Breakdown by Project Guide Modal */}
      <GuideModal
        isOpen={activeModal === 'status-breakdown'}
        onClose={onClose}
        title="About Status Breakdown by Project"
        subtitle="Distribution of test outcomes per configured Playwright project profile"
      >
        <p>
          This horizontal stacked bar chart displays the distribution of test execution outcomes for
          each configured Playwright project profile (e.g., Chromium, Firefox, WebKit, Mobile
          Chrome).
        </p>

        <div className="rounded-md border border-border-default bg-surface-50 p-3 space-y-2">
          <h5 className="font-semibold text-text-ink dark:text-text-on-primary mb-1">
            Status Categories:
          </h5>
          <ul className="list-disc pl-4 space-y-1">
            <li>
              <strong className="text-success-600 dark:text-success-500">Passed:</strong> Tests that
              executed and satisfied all assertion checks within timeout limits (clean passes on the
              first attempt).
            </li>
            <li>
              <strong className="text-warning-600 dark:text-warning-500">Flaky:</strong> Tests that
              initially failed but passed on an automatic retry, tracked separately from clean
              passes.
            </li>
            <li>
              <strong className="text-danger-600 dark:text-danger-500">Failed:</strong> Hard
              assertion failures or unhandled runtime exceptions.
            </li>
            <li>
              <strong className="text-danger-700 dark:text-danger-400">Timed Out:</strong> Tests
              exceeding the configured Playwright project timeout limit.
            </li>
            <li>
              <strong className="text-amber-600 dark:text-amber-500">Interrupted:</strong> Tests
              cancelled due to worker signals or parent run aborts.
            </li>
            <li>
              <strong className="text-slate-600 dark:text-slate-400">Skipped:</strong> Tests
              conditionally bypassed (
              <code className="font-mono bg-surface-100 px-1 py-0.5 rounded text-[10px]">
                test.skip()
              </code>
              ).
            </li>
          </ul>
        </div>

        <div className="rounded-md border border-border-default bg-surface-50 p-3 space-y-2">
          <h5 className="font-semibold text-text-ink dark:text-text-on-primary mb-1">
            Diagnostic Insights:
          </h5>
          <p>
            Comparing status stacks across projects allows you to immediately pinpoint
            browser-specific regressions. If failures concentrate in WebKit while Chromium passes,
            focus debugging on Safari rendering standards or engine differences.
          </p>
        </div>
      </GuideModal>

      {/* 2. Test Volume & Coverage Density Guide Modal */}
      <GuideModal
        isOpen={activeModal === 'volume-coverage'}
        onClose={onClose}
        title="Test Volume & Coverage Density per Project"
        subtitle="Understanding test suite distribution and active execution coverage"
      >
        <p>
          This chart benchmarks the total test case load and execution density across configured
          target project profiles (browsers and platforms).
        </p>

        <div className="rounded-md border border-border-default bg-surface-50 p-3 space-y-2">
          <div className="font-bold text-text-ink dark:text-text-on-primary text-xs tracking-wider">
            Key Metrics:
          </div>
          <ul className="list-disc list-inside space-y-1.5">
            <li>
              <strong className="text-sky-600 dark:text-sky-400">Executed Tests:</strong> Active
              test cases that ran to completion (Passed, Flaky, Failed, Timed Out, or Interrupted).
            </li>
            <li>
              <strong className="text-slate-600 dark:text-slate-400">Skipped Tests:</strong> Test
              cases bypassed via <code className="bg-surface-200 px-1 rounded">test.skip()</code> or
              conditional tags.
            </li>
            <li>
              <strong className="text-emerald-600 dark:text-emerald-400">
                Coverage Density (%):
              </strong>{' '}
              The ratio of executed tests over total tests (
              <code className="bg-surface-200 px-1 rounded">Executed / Total * 100</code>).
            </li>
          </ul>
        </div>

        <div className="rounded-md border border-border-default bg-surface-50 p-3 space-y-2">
          <div className="font-bold text-text-ink dark:text-text-on-primary text-xs tracking-wider">
            Operational Guidelines:
          </div>
          <ul className="list-disc list-inside space-y-1">
            <li>Ensure all target environments maintain high coverage density (≥95%).</li>
            <li>
              Unintended gaps between environments reveal browser-specific skips or conditional test
              exclusions.
            </li>
          </ul>
        </div>
      </GuideModal>

      {/* 3. Duration Spread & P95 Latency Benchmark Guide Modal */}
      <GuideModal
        isOpen={activeModal === 'duration-benchmark'}
        onClose={onClose}
        title="About Duration Spread & P95 Latency Benchmark"
      >
        <p>
          Each bar answers one question:{' '}
          <strong className="text-text-ink dark:text-text-on-primary">
            how much slower is the slowest 5% of tests than a typical test, in this project?
          </strong>{' '}
          The base segment is the typical (average) duration, and the tail segment is the P95 (95th
          percentile) extension beyond it. The dot marks the typical duration, and the value printed
          at the bar's end is the P95 with its tail multiplier (P95 / avg).
        </p>

        <div className="rounded-md border border-border-default bg-surface-50 p-3 space-y-2">
          <div className="font-bold text-text-ink dark:text-text-on-primary text-xs tracking-wider">
            <h5 className="font-semibold text-text-ink dark:text-text-on-primary mb-1">
              Reading the Bars:
            </h5>
          </div>
          <ul className="list-disc pl-4 space-y-1.5">
            <li>
              <strong className="text-text-ink dark:text-text-on-primary">
                Short or absent tail (dot near the end of the bar):
              </strong>{' '}
              timings are consistent — the slowest 5% of tests take about as long as a typical test.
              No slow outliers to chase.
            </li>
            <li>
              <strong className="text-text-ink dark:text-text-on-primary">
                Long tail (dot far from the end of the bar):
              </strong>{' '}
              heavy tail — the slowest 5% of tests take the printed multiple (Nx) of the typical
              time. Investigate that project's slowest tests or retries.
            </li>
            <li>
              <strong className="text-text-ink dark:text-text-on-primary">Bar order:</strong>{' '}
              projects are sorted worst tail first, so the top row is the one to act on.
            </li>
            <li>
              <strong className="text-text-ink dark:text-text-on-primary">
                Logarithmic x-axis:
              </strong>{' '}
              each major step (1 ms → 10 ms → 100 ms → 1 s) spans the same visual distance, so a 25
              ms tail and a 2.4 s tail stay readable side by side. Because the axis is logarithmic,
              a tail's visual length encodes the multiplier (P95 / avg), not an absolute amount of
              time—read the value printed at the bar's end, or hover the bar for the exact P95, to
              get the real duration.
            </li>
          </ul>
        </div>

        <div className="rounded-md border border-border-default bg-surface-50 p-3 space-y-2">
          <div className="font-bold text-text-ink dark:text-text-on-primary text-xs tracking-wider">
            <h5 className="font-semibold text-text-ink dark:text-text-on-primary mb-1">
              Key Metrics Explained:
            </h5>
          </div>
          <ul className="list-disc pl-4 space-y-1.5">
            <li>
              <strong className="text-accent-blue">Typical (avg) duration:</strong> Calculated as{' '}
              <code className="font-mono bg-surface-100 px-1 py-0.5 rounded text-[10px]">
                Total Duration / Executed Tests
              </code>
              . It represents the mean time required to complete a single test case in that project
              profile.
            </li>
            <li>
              <strong className="text-warning-600 dark:text-warning-500">P95 duration:</strong>{' '}
              Represents the 95th percentile completion threshold.{' '}
              <strong>
                95% of all executed tests in that project completed faster than this duration
              </strong>
              , while only 5% took longer.
            </li>
            <li>
              <strong className="text-warning-600 dark:text-warning-500">
                Tail multiplier (Nx):
              </strong>{' '}
              P95 divided by the average. Near 1 means consistent timings; well above 1 means a
              heavy tail worth investigating.
            </li>
          </ul>
        </div>

        <div className="rounded-md border border-border-default bg-surface-50 p-3 space-y-2">
          <div className="font-bold text-text-ink dark:text-text-on-primary text-xs tracking-wider">
            <h5 className="font-semibold text-text-ink dark:text-text-on-primary mb-1">
              Why P95 Latency is Critical for QA & CI Pipelines:
            </h5>
          </div>
          <p className="mb-1.5">
            Average duration can be deceptive—a large number of fast 100ms API checks will drag the
            average down, masking extremely slow 15-second E2E user flows.
          </p>
          <p className="mb-1.5">
            P95 isolates tail latency. High P95 latency exposes tests that suffer from:
          </p>
          <ul className="list-disc pl-4 space-y-1">
            <li>Unnecessary explicit sleep/timeout delays</li>
            <li>Heavy DOM re-rendering or unoptimized navigation</li>
            <li>CI worker CPU/RAM throttling on specific browser engines</li>
            <li>Slow background API network dependencies</li>
          </ul>
        </div>
      </GuideModal>

      {/* 4. Flaky Test Count & Retry Analytics Guide Modal */}
      <GuideModal
        isOpen={activeModal === 'project-flaky-rate'}
        onClose={onClose}
        title="Flaky Test Count & Retry Analytics Guide"
        subtitle="Analyzing cross-project test instability and environmental flakiness"
      >
        <p>
          This chart is scoped to the{' '}
          <strong className="text-text-ink dark:text-text-on-primary">current run</strong>. A test
          is classified as <strong className="text-warning-600 dark:text-warning-500">Flaky</strong>{' '}
          when it initially failed but passed on an automatic retry within the same run.
        </p>

        <div className="rounded-md border border-border-default bg-surface-50 p-3 space-y-2">
          <div className="font-bold text-text-ink dark:text-text-on-primary text-xs tracking-wider">
            Key Metrics:
          </div>
          <ul className="list-disc list-inside space-y-1">
            <li>
              <strong>Bar length (Flaky Tests):</strong> Number of test cases in the project that
              failed initially but passed on a retry in the current run.
            </li>
            <li>
              <strong>Flakiness Rate (%):</strong> Shown in the tooltip — the flaky test count
              divided by the executed (non-skipped) tests, times 100. It is the share of the
              project&apos;s tests that needed a retry to pass.
            </li>
            <li>
              <strong>Executed Tests:</strong> Shown in the tooltip — the number of non-skipped test
              cases in the project.
            </li>
          </ul>
        </div>

        <div className="rounded-md border border-border-default bg-surface-50 p-3 space-y-2">
          <div className="font-bold text-text-ink dark:text-text-on-primary text-xs tracking-wider">
            Diagnostic Value by Project Profile:
          </div>
          <ul className="list-disc list-inside space-y-1">
            <li>
              <strong>Project Comparisons:</strong> Compare projects to isolate environment-specific
              flakiness — projects may target different browsers (Chromium, Firefox, WebKit,
              Microsoft Edge, branded Chrome), different viewports or devices, or API-only and web +
              API test mixes. A spike in one project&apos;s flaky count points at that environment
              (rendering engine, network, or endpoint behavior).
            </li>
            <li>
              <strong>Viewport & Mobile Emulation:</strong> Identify if responsive layout tests
              flake on mobile viewports due to animation delays.
            </li>
            <li>
              <strong>Retry Overhead:</strong> Flaky tests double execution latency. Eliminating
              flakiness speeds up overall CI build time.
            </li>
          </ul>
        </div>
      </GuideModal>

      {/* 5. Project Health & Breakdown Guide Modal */}
      <GuideModal
        isOpen={activeModal === 'project-health'}
        onClose={onClose}
        title="Project Health & Breakdown Guide"
        subtitle="Granular execution metrics and deep-dive controls scoped to each project profile"
      >
        <p>
          The{' '}
          <strong className="text-text-ink dark:text-text-on-primary">
            Project Health & Breakdown
          </strong>{' '}
          panel provides granular execution metrics scoped to each configured Playwright project
          profile (e.g., cross-browser targets like Chromium, Firefox, WebKit, or custom test
          configurations).
        </p>

        <div className="rounded-md border border-border-default bg-surface-50 p-4 space-y-2.5">
          <div className="font-bold text-text-ink dark:text-text-on-primary text-xs tracking-wider">
            Key Metrics & Health Indicators:
          </div>
          <ul className="list-disc list-inside space-y-1.5">
            <li>
              <strong>Pass Rate:</strong> Percentage of executed test cases in the project profile
              that succeeded (calculated as{' '}
              <code className="bg-surface-200 px-1 rounded font-mono text-[10px]">
                (Passed + Flaky) / Total * 100
              </code>
              ). Tests that passed after automatic retries are recognized as successful runs.
            </li>
            <li>
              <strong>Status Breakdown (Two-Row Hierarchy):</strong>
              <ul className="list-disc pl-4 mt-1 space-y-1 text-xs">
                <li>
                  <strong className="text-text-ink dark:text-text-on-primary">
                    Row 1 (Successful & Skipped):
                  </strong>{' '}
                  <span className="text-success-600 dark:text-success-500 font-semibold">Pass</span>{' '}
                  (clean passes on first attempt),{' '}
                  <span className="text-warning-600 dark:text-warning-500 font-semibold">
                    Flaky
                  </span>{' '}
                  (passed on retry), and <span className="text-text-muted">Skip</span>.
                </li>
                <li>
                  <strong className="text-text-ink dark:text-text-on-primary">
                    Row 2 (Unresolved Failures):
                  </strong>{' '}
                  <span className="text-danger-600 dark:text-danger-500 font-semibold">Fail</span>{' '}
                  (assertion or runtime errors),{' '}
                  <span className="text-warning-600 dark:text-warning-500 font-semibold">
                    Timeout
                  </span>{' '}
                  (exceeded execution time limits), and{' '}
                  <span className="text-amber-600 dark:text-amber-500 font-semibold">
                    Interrupted
                  </span>{' '}
                  (cancelled execution), or <em>0 Failures</em> when all executed tests passed.
                </li>
              </ul>
            </li>
            <li>
              <strong>Execution Duration & Percentiles:</strong> Cumulative runtime across all
              tests, average duration per executed test, and 95th percentile (p95) execution latency
              to spot long-tail bottlenecks.
            </li>
            <li>
              <strong>Relative Speed Multiplier:</strong> The speed badge next to the project title
              indicates how that project's average test duration compares to the overall test suite
              average across all projects:
              <ul className="list-disc pl-4 mt-1 space-y-1 text-xs">
                <li>
                  <strong className="text-success-600 dark:text-success-500">
                    ⚡ N.Nx faster than avg:
                  </strong>{' '}
                  Average test duration is shorter than the overall run average.
                </li>
                <li>
                  <strong className="text-warning-600 dark:text-warning-500">
                    ⚡ N.Nx slower than avg:
                  </strong>{' '}
                  Average test duration is longer than the overall run average.
                </li>
                <li>
                  <strong className="text-text-muted">⚡ 1.0x avg speed:</strong> Average test
                  duration matches the overall run average.
                </li>
              </ul>
            </li>
            <li>
              <strong>Flaky / Retries:</strong> Dedicated count and percentage rate of tests that
              required retries to achieve a passing outcome (
              <code className="bg-surface-200 px-1 rounded font-mono text-[10px]">
                Flaky / Total * 100
              </code>
              ).
            </li>
            <li>
              <strong>Scope & Tags:</strong> Number of unique test spec files and categorized tags
              executed within this project target.
            </li>
          </ul>
        </div>

        <div className="rounded-md border border-border-default bg-surface-50 p-4 space-y-2.5">
          <div className="font-bold text-text-ink dark:text-text-on-primary text-xs tracking-wider">
            Diagnostic Controls & Deep Dives:
          </div>
          <ul className="list-disc list-inside space-y-1.5">
            <li>
              <strong>Search & Sort:</strong> Quickly filter project profiles by name or sort by
              Highest Pass Rate, Longest Duration, Most Flaky Tests, Most Tests, or Project Name
              using the custom styled dropdown.
            </li>
            <li>
              <strong>Inline Failure Inspection:</strong> Click the <em>View Failures</em> toggle
              directly beneath the status metrics to inspect step-by-step logs, error stack traces,
              code snippets, and attachments for any failing or timed out tests.
            </li>
          </ul>
        </div>
      </GuideModal>
    </>
  );
}
