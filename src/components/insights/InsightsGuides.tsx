import React from 'react';
import GuideModal from '@/components/shared/GuideModal';

export type InsightModalType = 'flaky-tests' | 'regressions' | 'slowest-tests' | null;

interface InsightsGuidesProps {
  activeModal: InsightModalType;
  onClose: () => void;
}

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
          table identifies non-deterministic tests that recorded BOTH passed and failed outcomes
          across historical test runs (minimum 1 failure and 1 success).
        </p>

        <div className="rounded-md border border-primary-500/20 bg-primary-500/5 p-3.5 space-y-1.5">
          <div className="font-bold text-text-ink dark:text-text-on-primary text-xs flex items-center gap-1.5">
            <span className="text-primary-600 dark:text-primary-400 font-bold">
              ℹ Note on Flakiness & Retry Definitions:
            </span>
          </div>
          <p className="text-xs text-text-body-mid dark:text-text-muted">
            <strong>Insights Tab (Historical Instability):</strong> Evaluates non-deterministic test
            behavior aggregated across multiple historical runs over time.
            <br />
            <strong>Files, Projects & Overview Tabs (In-Run Retries):</strong> Measures
            Playwright&apos;s official in-run retry status (test cases that failed initial execution
            but passed upon automatic retry within the single run).
          </p>
        </div>

        <div className="rounded-md border border-border-default bg-surface-50 p-4 space-y-2">
          <div className="font-bold text-text-ink dark:text-text-on-primary text-xs uppercase tracking-wider">
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
          <div className="font-bold text-text-ink dark:text-text-on-primary text-xs uppercase tracking-wider">
            Filtering Capabilities:
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
          <div className="font-bold text-text-ink dark:text-text-on-primary text-xs uppercase tracking-wider">
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
                  Regression Resolved
                </div>
                <p className="text-xs text-text-body-mid dark:text-text-muted mt-0.5">
                  The test regressed in a prior run, but passed cleanly in the most recent run.
                  <span className="block font-semibold text-success-600 dark:text-success-400 mt-1">
                    ✓ Next Action: None required. The regression has been resolved.
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
          <div className="font-bold text-text-ink dark:text-text-on-primary text-xs uppercase tracking-wider">
            Filtering Capabilities:
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
        <div className="rounded-md border border-border-default bg-surface-50 p-4 space-y-2">
          <div className="font-bold text-text-ink dark:text-text-on-primary text-xs uppercase tracking-wider">
            Optimization Strategy:
          </div>
          <p>
            Focusing refactoring efforts on these top 5 bottleneck tests yields the largest
            reduction in overall CI execution pipeline duration.
          </p>
        </div>
      </GuideModal>
    </>
  );
}
