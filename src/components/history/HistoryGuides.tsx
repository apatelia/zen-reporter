import React from 'react';
import GuideModal from '@/components/shared/GuideModal';

interface HistoryGuidesProps {
  isRunsModalOpen: boolean;
  onCloseRunsModal: () => void;
  isFileModalOpen: boolean;
  onCloseFileModal: () => void;
  isTestModalOpen: boolean;
  onCloseTestModal: () => void;
}

export default function HistoryGuides({
  isRunsModalOpen,
  onCloseRunsModal,
  isFileModalOpen,
  onCloseFileModal,
  isTestModalOpen,
  onCloseTestModal,
}: HistoryGuidesProps) {
  return (
    <>
      {/* Test Runs Interactive Modal Guide */}
      <GuideModal
        isOpen={isRunsModalOpen}
        onClose={onCloseRunsModal}
        title="Historical Test Runs Guide"
        subtitle="Column definitions, worker execution modes, and quality health thresholds"
      >
        <p>
          The{' '}
          <strong className="text-text-ink dark:text-text-on-primary">Test Runs Audit Log</strong>{' '}
          provides a complete historical record of every test suite execution processed and saved in
          Zen Reporter&apos;s run store.
        </p>
        <div className="rounded-md border border-border-default bg-surface-50 p-4 space-y-2">
          <div className="font-bold text-text-ink dark:text-text-on-primary text-xs uppercase tracking-wider">
            Table Column Definitions:
          </div>
          <ul className="list-disc list-inside space-y-1">
            <li>
              <strong>Mode:</strong> Indicates whether the run executed sequentially (Serial) or
              concurrently across multiple worker processes (`--workers`).
            </li>
            <li>
              <strong>Duration:</strong> Total wall-clock execution time elapsed for the test run.
            </li>
            <li>
              <strong>Time Saved:</strong> Difference between cumulative test execution time
              (sequential effort) and actual wall-clock duration when running in parallel mode (e.g.
              ⚡ 3m 45s saved with 4x speedup).
            </li>
            <li>
              <strong>Status Breakdown:</strong> Counts for Passed, Failed, Skipped, Timed Out, and
              Interrupted test outcomes.
            </li>
          </ul>
        </div>

        <div className="rounded-md border border-border-default bg-surface-50 p-4 space-y-2">
          <div className="font-bold text-text-ink dark:text-text-on-primary text-xs uppercase tracking-wider">
            Pass Rate Health Categories & Status Badges:
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
            <div className="rounded bg-success-50 p-2.5 text-success-700 dark:bg-success-500/20 dark:text-success-400 font-medium">
              <div className="font-bold text-xs mb-1">🟢 ≥90% (Excellent)</div>
              Suite is healthy and meets quality target for automated CI/CD deployment gates.
            </div>
            <div className="rounded bg-warning-50 p-2.5 text-warning-700 dark:bg-warning-500/20 dark:text-warning-400 font-medium">
              <div className="font-bold text-xs mb-1">🟡 60–89% (Needs Improvement)</div>
              Elevated failure volume or flakiness present. Developer triage recommended.
            </div>
            <div className="rounded bg-danger-50 p-2.5 text-danger-700 dark:bg-danger-500/20 dark:text-danger-400 font-medium">
              <div className="font-bold text-xs mb-1">🔴 &lt;60% (Critical)</div>
              Severe test suite breakage or infrastructure outage requiring immediate fix.
            </div>
          </div>
        </div>

        <div className="rounded-md border border-border-default bg-surface-50 p-4 space-y-2">
          <div className="font-bold text-text-ink dark:text-text-on-primary text-xs uppercase tracking-wider">
            Filtering Capabilities:
          </div>
          <ul className="list-disc list-inside space-y-1">
            <li>
              <strong>Date Range Filter:</strong> Filter test runs for All Time, specific calendar
              months, or custom date ranges.
            </li>
          </ul>
        </div>
      </GuideModal>

      {/* File History Interactive Modal Guide */}
      <GuideModal
        isOpen={isFileModalOpen}
        onClose={onCloseFileModal}
        title="File Execution History Guide"
        subtitle="Historical spec file metrics, test aggregation, and cross-run pass rate indicators"
      >
        <p>
          The <strong className="text-text-ink dark:text-text-on-primary">File History</strong>{' '}
          table provides an aggregated breakdown of test execution stats across all test runs stored
          in Zen Reporter, grouped by spec file.
        </p>
        <div className="rounded-md border border-border-default bg-surface-50 p-4 space-y-2">
          <div className="font-bold text-text-ink dark:text-text-on-primary text-xs uppercase tracking-wider">
            Table Column Definitions:
          </div>
          <ul className="list-disc list-inside space-y-1">
            <li>
              <strong>Spec File:</strong> Relative path of the Playwright test specification file.
            </li>
            <li>
              <strong>Runs:</strong> Count of unique historical test execution runs containing tests
              from this spec file in the active date range.
            </li>
            <li>
              <strong>Total Tests:</strong> Cumulative count of test cases executed across all
              matching runs for this spec file.
            </li>
            <li>
              <strong>Status Breakdown:</strong> Aggregate counts for Passed, Failed, Timed Out,
              Interrupted, and Skipped test outcomes.
            </li>
            <li>
              <strong>Pass Rate:</strong> Overall pass percentage across all test executions for
              this file (`(Passed / Total) * 100`).
            </li>
          </ul>
        </div>

        <div className="rounded-md border border-border-default bg-surface-50 p-4 space-y-2">
          <div className="font-bold text-text-ink dark:text-text-on-primary text-xs uppercase tracking-wider">
            Filtering Capabilities:
          </div>
          <ul className="list-disc list-inside space-y-1">
            <li>
              <strong>Date Range Filter:</strong> Filter spec file execution metrics for All Time,
              specific calendar months, or custom date ranges.
            </li>
            <li>
              <strong>Spec File Search:</strong> Instantly filter spec files by filename or path
              substring without clearing active date filters.
            </li>
          </ul>
        </div>
      </GuideModal>

      {/* Test History Interactive Modal Guide */}
      <GuideModal
        isOpen={isTestModalOpen}
        onClose={onCloseTestModal}
        title="Test Execution History Guide"
        subtitle="Historical test-level performance, execution breakdown across runs, and pass rate indicators"
      >
        <p>
          The <strong className="text-text-ink dark:text-text-on-primary">Test History</strong>{' '}
          table provides a granular breakdown of stats for individual tests over executed test runs
          in Zen Reporter.
        </p>
        <div className="rounded-md border border-border-default bg-surface-50 p-4 space-y-2">
          <div className="font-bold text-text-ink dark:text-text-on-primary text-xs uppercase tracking-wider">
            Table Column Definitions:
          </div>
          <ul className="list-disc list-inside space-y-1">
            <li>
              <strong>Test:</strong> Name / title of the individual test case.
            </li>
            <li>
              <strong>Suite & Spec File:</strong> Containing test suite hierarchy and spec file
              location.
            </li>
            <li>
              <strong>Project:</strong> Target execution browser configuration (e.g. chromium,
              firefox).
            </li>
            <li>
              <strong>Runs:</strong> Count of unique historical test runs that executed this test.
            </li>
            <li>
              <strong>Status Breakdown:</strong> Aggregate execution counts for Passed, Failed,
              Timed Out, Interrupted, and Skipped outcomes.
            </li>
            <li>
              <strong>Avg Duration:</strong> Average runtime duration of the test case across runs.
            </li>
            <li>
              <strong>Pass Rate:</strong> Percentage of successful executions for this test
              (`(Passed / Total) * 100`).
            </li>
          </ul>
        </div>

        <div className="rounded-md border border-border-default bg-surface-50 p-4 space-y-2">
          <div className="font-bold text-text-ink dark:text-text-on-primary text-xs uppercase tracking-wider">
            Filtering Capabilities:
          </div>
          <ul className="list-disc list-inside space-y-1">
            <li>
              <strong>Date Range Filter:</strong> Filter test execution metrics for All Time,
              specific calendar months, or custom date ranges.
            </li>
            <li>
              <strong>Text Search Filter (Visible Columns):</strong> Dynamically search visible
              columns (Test Title, Suite, Spec File, and Project) without resetting active date
              filters.
            </li>
          </ul>
        </div>
      </GuideModal>
    </>
  );
}
