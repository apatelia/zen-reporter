import GuideModal from '@/components/shared/GuideModal';

interface ProjectsGuidesProps {
  statusBreakdownModalOpen: boolean;
  onCloseStatusBreakdownModal: () => void;
  volumeCoverageModalOpen: boolean;
  onCloseVolumeCoverageModal: () => void;
  projectHealthModalOpen: boolean;
  onCloseProjectHealthModal: () => void;
}

export default function ProjectsGuides({
  statusBreakdownModalOpen,
  onCloseStatusBreakdownModal,
  volumeCoverageModalOpen,
  onCloseVolumeCoverageModal,
  projectHealthModalOpen,
  onCloseProjectHealthModal,
}: ProjectsGuidesProps) {
  return (
    <>
      {/* 1. Status Breakdown by Project Guide Modal */}
      <GuideModal
        isOpen={statusBreakdownModalOpen}
        onClose={onCloseStatusBreakdownModal}
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
              executed and satisfied all assertion checks within timeout limits.
            </li>
            <li>
              <strong className="text-danger-600 dark:text-danger-500">Failed:</strong> Hard
              assertion failures or unhandled runtime exceptions.
            </li>
            <li>
              <strong className="text-warning-600 dark:text-warning-500">Timed Out:</strong> Tests
              exceeding the configured Playwright project timeout limit.
            </li>
            <li>
              <strong className="text-danger-700 dark:text-danger-400">Interrupted:</strong> Tests
              cancelled due to worker signals or parent run aborts.
            </li>
            <li>
              <strong className="text-text-muted">Skipped:</strong> Tests conditionally bypassed (
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
        isOpen={volumeCoverageModalOpen}
        onClose={onCloseVolumeCoverageModal}
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
              test cases that ran to completion (Passed, Failed, Timed Out, or Interrupted).
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

      {/* 3. Project Health & Breakdown Guide Modal */}
      <GuideModal
        isOpen={projectHealthModalOpen}
        onClose={onCloseProjectHealthModal}
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
              <strong>Pass Rate:</strong> Percentage of test cases in the project profile that
              executed cleanly to completion.
            </li>
            <li>
              <strong>Execution Duration:</strong> Cumulative runtime and average duration per test
              case within the project target.
            </li>
            <li>
              <strong>Duration Percentiles (p95, Median, Min, Max):</strong> Detailed timing stats
              to identify long-tail execution bottlenecks across specs.
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
              <strong>Retries & In-Run Flakiness:</strong> Count and percentage of test cases that
              failed on initial attempt but succeeded after automatic retries.
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
              Pass Rate, Cumulative Duration, Retry Count, or Total Test Volume.
            </li>
            <li>
              <strong>Expandable Failure Details:</strong> Click any project card with errors to
              expand and inspect step-by-step logs, stack traces, snippets, and attachments scoped
              strictly to that project target.
            </li>
          </ul>
        </div>
      </GuideModal>
    </>
  );
}
