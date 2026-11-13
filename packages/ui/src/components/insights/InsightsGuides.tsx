import GuideModal from '@/components/shared/GuideModal';

export type InsightModalType =
  | 'flaky-tests'
  | 'regressions'
  | 'slowest-tests'
  | 'duration-benchmark'
  | 'project-flaky-rate'
  | null;

interface InsightsGuidesProps {
  activeModal: InsightModalType;
  onClose: () => void;
}

/**
 * Renders the Insights tab guide modals: one modal per insight type, opened by
 * the active modal id and closed via the onClose callback.
 * @param activeModal - The insight guide modal id currently open, or null.
 * @param onClose - Callback that clears the open modal.
 * @returns The guide modals for the Insights tab.
 */
export default function InsightsGuides({ activeModal, onClose }: InsightsGuidesProps) {
  return (
    <>
      <GuideModal
        isOpen={activeModal === 'flaky-tests'}
        onClose={onClose}
        title="Flaky Test Analytics Guide"
        subtitle="Metric definitions, targets, and diagnostic guidelines for Zen Reporter"
      >
        <p>
          The{' '}
          <strong className="text-text-ink dark:text-text-on-primary">Flaky Tests Analytics</strong>{' '}
          table identifies non-deterministic tests across historical test runs: tests that failed
          (or timed out) in one run and passed in another, or tests that failed on the first attempt
          but passed on an automatic retry within a single run. Rows are sorted by failed-run count,
          so the most unstable tests come first.
        </p>

        <div className="rounded-md border border-success-500/20 bg-success-500/5 p-3.5 space-y-1.5">
          <div className="font-bold text-text-ink dark:text-text-on-primary text-xs flex items-center gap-1.5">
            <span className="text-success-600 dark:text-success-400 font-bold">
              ⚠️ Note on Flakiness & Retry Definitions:
            </span>
          </div>
          <ul className="list-disc list-inside space-y-1">
            <li>
              <strong>Insights Tab (Historical Instability):</strong> Evaluates non-deterministic
              test behavior aggregated across multiple historical runs over time.
            </li>
            <li>
              <strong>Files, Projects & Overview Tabs (In-Run Retries):</strong> Measures
              Playwright&apos;s official in-run retry status (test cases that failed initial
              execution but passed upon automatic retry within the single run).
            </li>
          </ul>
        </div>

        <div className="rounded-md border border-border-default bg-surface-50 p-4 space-y-2">
          <div className="font-bold text-text-ink dark:text-text-on-primary text-xs tracking-wider">
            Table Columns:
          </div>
          <ul className="list-disc list-inside space-y-1">
            <li>
              <strong>Suite:</strong> The suite (folder path) that contains the test.
            </li>
            <li>
              <strong>Test:</strong> The test title.
            </li>
            <li>
              <strong>Project:</strong> The Playwright project the test ran under.
            </li>
            <li>
              <strong>Last Flaky Date:</strong> Local timestamp of the most recent run in which the
              test was flaky (failed, timed out, or passed after a retry). Shows a "Filtered" pill
              in its header when a date range filter is active.
            </li>
            <li>
              <strong>Failed Runs:</strong> How many historical runs the test ended as failed or
              timed out (highlighted when greater than 0).
            </li>
            <li>
              <strong>Passed Runs:</strong> How many historical runs the test passed (highlighted
              when greater than 0).
            </li>
            <li>
              <strong>Recovered by Retry:</strong> How many historical runs the test failed on the
              first attempt but passed on an automatic retry (highlighted when greater than 0).
            </li>
            <li>
              <strong>Total Runs:</strong> Total historical runs in which the test appeared.
            </li>
          </ul>
        </div>

        <div className="rounded-md border border-border-default bg-surface-50 p-4 space-y-2">
          <div className="font-bold text-text-ink dark:text-text-on-primary text-xs tracking-wider">
            Remediation Guidelines:
          </div>
          <ul className="list-disc list-inside space-y-1">
            <li>
              <strong>Recovered by Retry:</strong> Tracks tests that failed on attempt #1 but passed
              on automatic retry.
            </li>
            <li>
              <strong>Eliminate Pauses:</strong> Replace explicit `page.waitForTimeout()` delays
              with web-first assertions like `expect(locator).toBeVisible()`.
            </li>
            <li>
              <strong>State Isolation:</strong> Ensure test cases do not share global mutable state
              or session tokens.
            </li>
          </ul>
        </div>

        <div className="rounded-md border border-border-default bg-surface-50 p-4 space-y-2">
          <div className="font-bold text-text-ink dark:text-text-on-primary text-xs tracking-wider">
            Filtering & Export Capabilities:
          </div>
          <ul className="list-disc list-inside space-y-1">
            <li>
              <strong>Date Range Filter:</strong> Filter flaky test analytics for All Time, specific
              calendar months, or custom date ranges.
            </li>
            <li>
              <strong>Test Search:</strong> Dynamically search tests by title, suite, or project
              without clearing active date filters.
            </li>
            <li>
              <strong>Export CSV:</strong> Download all filtered flaky test records into an RFC
              4180-compliant CSV file (un-paginated).
            </li>
          </ul>
        </div>
      </GuideModal>

      <GuideModal
        isOpen={activeModal === 'regressions'}
        onClose={onClose}
        title="Test Regressions Guide"
        subtitle="Metric definitions, targets, and diagnostic guidelines for Zen Reporter"
      >
        <p>
          The <strong className="text-text-ink dark:text-text-on-primary">Test Regressions</strong>{' '}
          table tracks test cases that previously succeeded in an earlier run but broke and failed
          in a subsequent execution.
        </p>
        <div className="rounded-md border border-border-default bg-surface-50 p-4 space-y-2.5">
          <div className="font-bold text-text-ink dark:text-text-on-primary text-xs tracking-wider">
            Last Run Status Meanings & Next Actions Required:
          </div>
          <div className="space-y-2">
            <div className="grid grid-cols-[100px_1fr] items-start gap-3 rounded bg-surface-100 p-2.5 border border-border-default">
              <div className="shrink-0 pt-0.5">
                <span className="inline-flex w-full items-center justify-center rounded-full px-2.5 py-0.5 text-xs font-semibold bg-success-50 text-success-600 dark:bg-success-500/10 dark:text-success-500 text-center">
                  Passed
                </span>
              </div>
              <div>
                <div className="font-bold text-text-ink dark:text-text-on-primary text-xs">
                  Regression Possibly Resolved
                </div>
                <p className="text-xs text-text-body-mid dark:text-text-muted mt-0.5">
                  The test regressed in a prior run, but passed cleanly in the most recent run.
                  <span className="block font-semibold text-success-600 dark:text-success-400 mt-1">
                    🔍 Next Action: Perform iterative testing to ensure the regression is fully
                    resolved.
                  </span>
                </p>
              </div>
            </div>

            <div className="grid grid-cols-[100px_1fr] items-start gap-3 rounded bg-surface-100 p-2.5 border border-border-default">
              <div className="shrink-0 pt-0.5">
                <span className="inline-flex w-full items-center justify-center rounded-full px-2.5 py-0.5 text-xs font-semibold bg-danger-50 text-danger-600 dark:bg-danger-500/10 dark:text-danger-500 text-center">
                  Failed
                </span>
              </div>
              <div>
                <div className="font-bold text-text-ink dark:text-text-on-primary text-xs">
                  Active Test Failure
                </div>
                <p className="text-xs text-text-body-mid dark:text-text-muted mt-0.5">
                  The test failed during the most recent run due to an assertion failure or uncaught
                  exception.
                  <span className="block font-semibold text-danger-600 dark:text-danger-400 mt-1">
                    ⚠️ Next Action: Priority fix required. Inspect stack trace in Failures tab.
                  </span>
                </p>
              </div>
            </div>

            <div className="grid grid-cols-[100px_1fr] items-start gap-3 rounded bg-surface-100 p-2.5 border border-border-default">
              <div className="shrink-0 pt-0.5">
                <span className="inline-flex w-full items-center justify-center rounded-full px-2.5 py-0.5 text-xs font-semibold bg-warning-50 text-warning-600 dark:bg-warning-500/10 dark:text-warning-500 text-center">
                  Timed Out
                </span>
              </div>
              <div>
                <div className="font-bold text-text-ink dark:text-text-on-primary text-xs">
                  Execution Timeout
                </div>
                <p className="text-xs text-text-body-mid dark:text-text-muted mt-0.5">
                  The test exceeded its maximum allocated runtime (e.g. 30,000ms) without
                  completing.
                  <span className="block font-semibold text-warning-600 dark:text-warning-400 mt-1">
                    ⏱️ Next Action: Check for hanging promises, unhandled dynamic waits, or backend
                    latency.
                  </span>
                </p>
              </div>
            </div>

            <div className="grid grid-cols-[100px_1fr] items-start gap-3 rounded bg-surface-100 p-2.5 border border-border-default">
              <div className="shrink-0 pt-0.5">
                <span className="inline-flex w-full items-center justify-center rounded-full px-2.5 py-0.5 text-xs font-semibold bg-danger-50 text-danger-600 dark:bg-danger-500/10 dark:text-danger-500 text-center">
                  Interrupted
                </span>
              </div>
              <div>
                <div className="font-bold text-text-ink dark:text-text-on-primary text-xs">
                  Run Cancelled / Interrupted
                </div>
                <p className="text-xs text-text-body-mid dark:text-text-muted mt-0.5">
                  The test run was terminated early (e.g. SIGINT or CI worker cancellation) before
                  completion.
                  <span className="block font-semibold text-text-body-mid dark:text-text-muted mt-1">
                    🔄 Next Action: Re-run the test suite to establish current status.
                  </span>
                </p>
              </div>
            </div>

            <div className="grid grid-cols-[100px_1fr] items-start gap-3 rounded bg-surface-100 p-2.5 border border-border-default">
              <div className="shrink-0 pt-0.5">
                <span className="inline-flex w-full items-center justify-center rounded-full px-2.5 py-0.5 text-xs font-semibold bg-slate-200 text-slate-800 dark:bg-slate-700 dark:text-slate-200 text-center">
                  Skipped
                </span>
              </div>
              <div>
                <div className="font-bold text-text-ink dark:text-text-on-primary text-xs">
                  Test Skipped
                </div>
                <p className="text-xs text-text-body-mid dark:text-text-muted mt-0.5">
                  The test was explicitly skipped via `test.skip()` or conditional tags in the last
                  run.
                  <span className="block font-semibold text-text-body-mid dark:text-text-muted mt-1">
                    🔍 Next Action: Verify if test skip condition is still required or ready to
                    re-enable.
                  </span>
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-md border border-border-default bg-surface-50 p-4 space-y-2">
          <div className="font-bold text-text-ink dark:text-text-on-primary text-xs tracking-wider">
            Filtering & Export Capabilities:
          </div>
          <ul className="list-disc list-inside space-y-1">
            <li>
              <strong>Date Range Filter:</strong> Filter test regressions for All Time, specific
              calendar months, or custom date ranges.
            </li>
            <li>
              <strong>Test Search:</strong> Dynamically search tests by title, suite, or project
              without clearing active date filters.
            </li>
            <li>
              <strong>Export CSV:</strong> Download all detected regression items to an RFC
              4180-compliant CSV file (un-paginated).
            </li>
          </ul>
        </div>
      </GuideModal>

      <GuideModal
        isOpen={activeModal === 'slowest-tests'}
        onClose={onClose}
        title="Slowest Tests Guide"
        subtitle="Metric definitions, targets, and diagnostic guidelines for Zen Reporter"
      >
        <p>
          The <strong className="text-text-ink dark:text-text-on-primary">Slowest Tests</strong>{' '}
          table lists the top 5 test cases with the highest average execution duration across
          history.
        </p>

        <div className="rounded-md border border-border-default bg-surface-50 p-4 space-y-2.5">
          <div className="font-bold text-text-ink dark:text-text-on-primary text-xs tracking-wider">
            Key Metrics Explained:
          </div>
          <ul className="list-disc list-inside space-y-1.5 text-xs text-text-body-mid dark:text-text-muted">
            <li>
              <strong className="text-text-ink dark:text-text-on-primary">Average Duration:</strong>{' '}
              The cumulative baseline execution duration across recorded historical runs.
            </li>
            <li>
              <strong className="text-text-ink dark:text-text-on-primary">Max Duration:</strong> The
              single worst-case peak runtime encountered (useful for spotting transient spikes or CI
              throttling).
            </li>
            <li>
              <strong className="text-text-ink dark:text-text-on-primary">
                Last Run Duration:
              </strong>{' '}
              The most recent recorded runtime for the test.
            </li>
            <li>
              <strong className="text-text-ink dark:text-text-on-primary">Last Run:</strong> The
              timestamp of the test's most recent run.
            </li>
            <li>
              <strong className="text-text-ink dark:text-text-on-primary">Last Run Status:</strong>{' '}
              The outcome of the test in its most recent run.
            </li>
          </ul>
        </div>

        <div className="rounded-md border border-border-default bg-surface-50 p-4 space-y-2">
          <div className="font-bold text-text-ink dark:text-text-on-primary text-xs tracking-wider">
            Export Capabilities:
          </div>
          <ul className="list-disc list-inside space-y-1">
            <li>
              <strong>Export CSV:</strong> Download the slowest tests list to an RFC 4180-compliant
              CSV file.
            </li>
          </ul>
        </div>

        <div className="rounded-md border border-border-default bg-surface-50 p-4 space-y-2">
          <div className="font-bold text-text-ink dark:text-text-on-primary text-xs tracking-wider">
            Diagnostic & Optimization Strategy:
          </div>
          <ul className="list-disc list-inside space-y-1.5 text-xs text-text-body-mid dark:text-text-muted">
            <li>
              <strong>Active Regression Detection:</strong> If <em>Last Run Duration</em> is
              significantly higher than <em>Average Duration</em>, recent code or test script
              updates introduced a execution bottleneck.
            </li>
            <li>
              <strong>Optimization Verification:</strong> Compare <em>Last Run Duration</em> against{' '}
              <em>Average Duration</em> after refactoring to immediately verify if performance
              improvements took effect without waiting for long-term historical averages to drift
              down.
            </li>
            <li>
              <strong>CI Pipeline Impact:</strong> Refactoring these top bottleneck tests yields the
              highest overall reduction in suite execution time.
            </li>
          </ul>
        </div>
      </GuideModal>

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

      <GuideModal
        isOpen={activeModal === 'project-flaky-rate'}
        onClose={onClose}
        title="Flaky Test Count & Retry Analytics Guide"
        subtitle="Analyzing cross-project test instability and environmental flakiness"
      >
        <p>
          This chart is scoped to the{' '}
          <strong className="text-text-ink dark:text-text-on-primary">current run</strong>, unlike
          the historical Flaky Tests Analytics table below it. A test is classified as{' '}
          <strong className="text-warning-600 dark:text-warning-500">Flaky</strong> when it
          initially failed but passed on an automatic retry within the same run.
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
              project's tests that needed a retry to pass.
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
    </>
  );
}
