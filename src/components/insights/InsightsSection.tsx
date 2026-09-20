import { useState } from 'react';
import type { HistoryData, TestSuite } from '@/lib/types';
import {
  formatDate,
  formatDurationVerbose,
  computeProjectStats,
  collectAllCases,
} from '@/lib/utils';
import ProjectFlakyRateChart from './ProjectFlakyRateChart';
import ProjectDurationChart from '@/components/insights/ProjectDurationChart';
import { usePagination, PageSizeControl, PaginationFooter } from '@/components/pagination';
import { LearnMoreButton } from '@/components/shared';

interface Props {
  history: HistoryData | null;
  suites: TestSuite[];
}

type InsightModalType = 'flaky-tests' | 'regressions' | 'slowest-tests' | null;

const th = 'px-2 py-2.5 text-left font-bold text-text-ink dark:text-text-on-primary';
const thNum = 'px-2 py-2.5 text-right font-bold text-text-ink dark:text-text-on-primary';
const td = 'px-2 py-2.5 text-text-ink dark:text-text-on-primary tabular-nums';
const tdNum = 'px-2 py-2.5 text-right text-text-ink dark:text-text-on-primary tabular-nums';

const sectionClass = 'rounded-md border border-border-default bg-surface-50 p-5 shadow-xs';
const headingClass = 'text-lg font-bold text-text-ink dark:text-text-on-primary';

const lastStatusStyles: Record<string, { label: string; pillClass: string; tooltip: string }> = {
  passed: {
    label: 'Passed',
    pillClass: 'bg-success-50 text-success-600 dark:bg-success-500/10 dark:text-success-500',
    tooltip: 'Regression resolved: test passed in the latest run.',
  },
  failed: {
    label: 'Failed',
    pillClass: 'bg-danger-50 text-danger-600 dark:bg-danger-500/10 dark:text-danger-500',
    tooltip: 'Test failed during the last run. Fixing may be required.',
  },
  timedOut: {
    label: 'Timed Out',
    pillClass: 'bg-warning-50 text-warning-600 dark:bg-warning-500/10 dark:text-warning-500',
    tooltip: 'Test timed out during the last run. Fixing may be required.',
  },
  interrupted: {
    label: 'Interrupted',
    pillClass: 'bg-danger-50 text-danger-600 dark:bg-danger-500/10 dark:text-danger-500',
    tooltip: 'Test run was interrupted. Try to re-run the test to verify status.',
  },
  skipped: {
    label: 'Skipped',
    pillClass:
      'bg-slate-200/80 text-slate-800 ring-1 ring-slate-300 dark:bg-slate-700/60 dark:text-slate-200 dark:ring-slate-600',
    tooltip: 'Test was skipped. Try to re-run the test to verify status.',
  },
};

export default function InsightsSection({ history, suites }: Props) {
  const [activeModal, setActiveModal] = useState<InsightModalType>(null);
  const flakyPag = usePagination(history?.flaky.length ?? 0, 10);
  const regressionsPag = usePagination(history?.regressions.length ?? 0, 10);

  const flakyRows = history?.flaky.slice(flakyPag.start, flakyPag.start + flakyPag.pageSize) ?? [];
  const regressionRows =
    history?.regressions.slice(
      regressionsPag.start,
      regressionsPag.start + regressionsPag.pageSize
    ) ?? [];
  const slowestRows = history?.slowest.slice(0, 5) ?? [];

  return (
    <div className="space-y-6">
      <h2 className="mb-4 text-2xl font-bold tracking-tight text-text-ink dark:text-text-on-primary sm:text-3xl">
        Analytical Insights
      </h2>

      {/* 1. Duration & P95 Latency Benchmark Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 items-stretch">
        <ProjectDurationChart
          projectStats={computeProjectStats(collectAllCases(suites))}
          title="Execution Duration & P95 Latency Benchmark"
          className="rounded-md border border-border-default bg-surface-50 p-5 shadow-xs flex flex-col justify-between"
        />
        <ProjectFlakyRateChart suites={suites} title="Flaky Test Count & Retry Rate by Project" />
      </div>

      {!history ? (
        <div className="flex items-center justify-center py-16 text-center rounded-md border border-border-default bg-surface-50 p-6">
          <div>
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-md bg-surface-100 border border-border-default">
              <svg
                className="h-8 w-8 text-text-ink dark:text-text-on-primary"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.75}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <h3 className="text-base font-bold text-text-ink dark:text-text-on-primary">
              No history data
            </h3>
            <p className="mt-1.5 text-sm text-text-body-mid dark:text-text-muted">
              Run{' '}
              <code className="rounded bg-surface-200 px-1.5 py-0.5 text-xs font-mono font-semibold text-text-ink dark:text-text-on-primary border border-border-default">
                npx zr history report
              </code>{' '}
              after your test runs to populate flaky test history, regressions, and slowest tests.
            </p>
          </div>
        </div>
      ) : (
        <>
          {/* 2. Flaky Tests Section */}
          <section className={sectionClass}>
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className={headingClass}>Flaky tests</h2>
                  <LearnMoreButton onClick={() => setActiveModal('flaky-tests')} />
                </div>
                <p className="mt-1 text-xs font-medium text-text-body-mid dark:text-text-muted">
                  Tests that failed in some runs and passed in others (minimum 1 failure and 1
                  success)
                </p>
              </div>
              <PageSizeControl
                id="flaky-page-size"
                pageSize={flakyPag.pageSize}
                onPageSizeChange={flakyPag.changePageSize}
              />
            </div>
            {history.flaky.length === 0 ? (
              <p className="mt-3 text-xs font-medium text-text-body-mid dark:text-text-muted">
                No flaky tests detected.
              </p>
            ) : (
              <>
                <div className="mt-3 overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b-2 border-border-default bg-surface-100/50 dark:bg-surface-100/30">
                        <th className={th}>Suite</th>
                        <th className={th}>Test</th>
                        <th className={th}>Project</th>
                        <th className={thNum}>Failed Runs</th>
                        <th className={thNum}>Passed Runs</th>
                        <th className={thNum}>Recovered by Retry</th>
                        <th className={thNum}>Total Runs</th>
                      </tr>
                    </thead>
                    <tbody>
                      {flakyRows.map((row, i) => (
                        <tr
                          // eslint-disable-next-line @eslint-react/no-array-index-key
                          key={`${row.project}/${row.file}/${row.title}/${i}`}
                          className="border-b border-border-default hover:bg-surface-100/60 dark:hover:bg-surface-200/40 transition-colors"
                        >
                          <td className={td}>{row.suite || '-'}</td>
                          <td className={`${td} font-bold`}>{row.title}</td>
                          <td className={td}>{row.project}</td>
                          <td
                            className={`${tdNum} ${row.failed_runs > 0 ? 'text-danger-600 dark:text-danger-500 font-bold' : ''}`}
                          >
                            {row.failed_runs}
                          </td>
                          <td
                            className={`${tdNum} ${row.passed_runs > 0 ? 'text-success-600 dark:text-success-500 font-bold' : ''}`}
                          >
                            {row.passed_runs}
                          </td>
                          <td
                            className={`${tdNum} ${row.recovered_by_retry > 0 ? 'text-warning-600 dark:text-warning-500 font-bold' : ''}`}
                          >
                            {row.recovered_by_retry}
                          </td>
                          <td className={`${tdNum} font-bold`}>{row.total_runs}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <PaginationFooter
                  label="flaky tests"
                  total={history.flaky.length}
                  start={flakyPag.start}
                  pageLength={flakyRows.length}
                  currentPage={flakyPag.currentPage}
                  totalPages={flakyPag.totalPages}
                  onPageChange={flakyPag.setPage}
                />
              </>
            )}
          </section>

          {/* 3. Regressions Section */}
          <section className={sectionClass}>
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className={headingClass}>Regressions</h2>
                  <LearnMoreButton onClick={() => setActiveModal('regressions')} />
                </div>
                <p className="mt-1 text-xs font-medium text-text-body-mid dark:text-text-muted">
                  Tests that previously passed in a prior run but failed during a subsequent run
                </p>
              </div>
              <PageSizeControl
                id="regressions-page-size"
                pageSize={regressionsPag.pageSize}
                onPageSizeChange={regressionsPag.changePageSize}
              />
            </div>
            {history.regressions.length === 0 ? (
              <p className="mt-3 text-xs font-medium text-text-body-mid dark:text-text-muted">
                No regressions detected.
              </p>
            ) : (
              <>
                <div className="mt-3 overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b-2 border-border-default bg-surface-100/50 dark:bg-surface-100/30">
                        <th className={th}>Test</th>
                        <th className={th}>Suite</th>
                        <th className={th}>Project</th>
                        <th className={th}>Regressed In</th>
                        <th className={th}>Last Run</th>
                        <th className={th}>Last Run Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {regressionRows.map((row) => {
                        const status = lastStatusStyles[row.last_status] ?? {
                          label: row.last_status,
                          pillClass:
                            'bg-slate-200/80 text-slate-800 ring-1 ring-slate-300 dark:bg-slate-700/60 dark:text-slate-200 dark:ring-slate-600',
                          tooltip: 'Try to re-run the test to verify status.',
                        };
                        return (
                          <tr
                            key={`${row.project}/${row.file}/${row.title}`}
                            className="border-b border-border-default hover:bg-surface-100/60 dark:hover:bg-surface-200/40 transition-colors"
                          >
                            <td className={`${td} font-bold`}>{row.title}</td>
                            <td className={td}>{row.suite || '-'}</td>
                            <td className={td}>{row.project}</td>
                            <td className={`${td} text-danger-600 dark:text-danger-500 font-bold`}>
                              {formatDate(row.regressed_at)}
                            </td>
                            <td className={td}>{formatDate(row.last_run_at)}</td>
                            <td className={td}>
                              <span
                                className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${status.pillClass}`}
                              >
                                {status.label}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <PaginationFooter
                  label="regressions"
                  total={history.regressions.length}
                  start={regressionsPag.start}
                  pageLength={regressionRows.length}
                  currentPage={regressionsPag.currentPage}
                  totalPages={regressionsPag.totalPages}
                  onPageChange={regressionsPag.setPage}
                />
              </>
            )}
          </section>

          {/* 4. Slowest Tests Section */}
          <section className={sectionClass}>
            <div className="flex items-center gap-2">
              <h2 className={headingClass}>Slowest tests</h2>
              <LearnMoreButton onClick={() => setActiveModal('slowest-tests')} />
            </div>
            {history.slowest.length === 0 ? (
              <p className="mt-3 text-xs font-medium text-text-body-mid dark:text-text-muted">
                No test duration data.
              </p>
            ) : (
              <div className="mt-3 overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b-2 border-border-default bg-surface-100/50 dark:bg-surface-100/30">
                      <th className={th}>Suite</th>
                      <th className={th}>Test</th>
                      <th className={th}>Project</th>
                      <th className={thNum}>Average Duration</th>
                      <th className={thNum}>Max Duration</th>
                      <th className={thNum}>Runs Count</th>
                    </tr>
                  </thead>
                  <tbody>
                    {slowestRows.map((row) => (
                      <tr
                        key={`${row.project}/${row.file}/${row.title}`}
                        className="border-b border-border-default hover:bg-surface-100/60 dark:hover:bg-surface-200/40 transition-colors"
                      >
                        <td className={td}>{row.suite || '-'}</td>
                        <td className={`${td} font-bold`}>{row.title}</td>
                        <td className={td}>{row.project}</td>
                        <td className={`${tdNum} font-bold text-accent-blue dark:text-success-500`}>
                          {formatDurationVerbose(row.avg_ms)}
                        </td>
                        <td className={tdNum}>{formatDurationVerbose(row.max_ms)}</td>
                        <td className={tdNum}>{row.runs}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}

      {/* Dynamic Modal Guide Component */}
      {activeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="relative w-full max-w-2xl rounded-lg border border-border-default bg-canvas p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-border-default pb-3.5">
              <div>
                <h3 className="text-xl font-bold text-text-ink dark:text-text-on-primary">
                  {activeModal === 'flaky-tests' && 'Flaky Test Analytics Guide'}
                  {activeModal === 'regressions' && 'Test Regressions Guide'}
                  {activeModal === 'slowest-tests' && 'Slowest Tests Guide'}
                </h3>
                <p className="mt-1 text-xs text-text-body-mid dark:text-text-muted">
                  Metric definitions, targets, and diagnostic guidelines for Zen Reporter
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="rounded-md p-1.5 text-text-body-mid hover:bg-surface-100 hover:text-text-ink dark:text-text-muted dark:hover:text-text-on-primary transition-colors cursor-pointer"
                title="Close guide"
              >
                <svg
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {activeModal === 'flaky-tests' && (
              <div className="space-y-4 text-xs text-text-body-mid dark:text-text-muted leading-relaxed">
                <p>
                  The{' '}
                  <strong className="text-text-ink dark:text-text-on-primary">
                    Flaky Tests Analytics
                  </strong>{' '}
                  table identifies non-deterministic tests that recorded BOTH passed and failed
                  outcomes across historical test runs (minimum 1 failure and 1 success).
                </p>

                <div className="rounded-md border border-primary-500/20 bg-primary-500/5 p-3.5 space-y-1.5">
                  <div className="font-bold text-text-ink dark:text-text-on-primary text-xs flex items-center gap-1.5">
                    <span className="text-primary-600 dark:text-primary-400 font-bold">
                      ℹ Note on Flakiness & Retry Definitions:
                    </span>
                  </div>
                  <p className="text-xs text-text-body-mid dark:text-text-muted">
                    <strong>Insights Tab (Historical Instability):</strong> Evaluates
                    non-deterministic test behavior aggregated across multiple historical runs over
                    time.
                    <br />
                    <strong>Files, Projects & Overview Tabs (In-Run Retries):</strong> Measures
                    Playwright&apos;s official in-run retry status (test cases that failed initial
                    execution but passed upon automatic retry within the single run).
                  </p>
                </div>

                <div className="rounded-md border border-border-default bg-surface-50 p-4 space-y-2">
                  <div className="font-bold text-text-ink dark:text-text-on-primary text-xs uppercase tracking-wider">
                    Remediation Guidelines:
                  </div>
                  <ul className="list-disc list-inside space-y-1">
                    <li>
                      <strong>Recovered by Retry:</strong> Tracks tests that failed on attempt #1
                      but passed on automatic retry.
                    </li>
                    <li>
                      <strong>Eliminate Pauses:</strong> Replace explicit `page.waitForTimeout()`
                      delays with web-first assertions like `expect(locator).toBeVisible()`.
                    </li>
                    <li>
                      <strong>State Isolation:</strong> Ensure test cases do not share global
                      mutable state or session tokens.
                    </li>
                  </ul>
                </div>
              </div>
            )}

            {activeModal === 'regressions' && (
              <div className="space-y-4 text-xs text-text-body-mid dark:text-text-muted leading-relaxed">
                <p>
                  The{' '}
                  <strong className="text-text-ink dark:text-text-on-primary">
                    Test Regressions
                  </strong>{' '}
                  table tracks test cases that previously succeeded in an earlier run but broke and
                  failed in a subsequent execution.
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
                          The test regressed in a prior run, but passed cleanly in the most recent
                          run.
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
                          The test failed during the most recent run due to an assertion failure or
                          uncaught exception.
                          <span className="block font-semibold text-danger-600 dark:text-danger-400 mt-1">
                            ⚠️ Next Action: Priority fix required. Inspect stack trace in Failures
                            tab.
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
                            ⏱️ Next Action: Check for hanging promises, unhandled dynamic waits, or
                            backend latency.
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
                          The test run was terminated early (e.g. SIGINT or CI worker cancellation)
                          before completion.
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
                          The test was explicitly skipped via `test.skip()` or conditional tags in
                          the last run.
                          <span className="block font-semibold text-text-body-mid dark:text-text-muted mt-1">
                            🔍 Next Action: Verify if test skip condition is still required or ready
                            to re-enable.
                          </span>
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeModal === 'slowest-tests' && (
              <div className="space-y-4 text-xs text-text-body-mid dark:text-text-muted leading-relaxed">
                <p>
                  The{' '}
                  <strong className="text-text-ink dark:text-text-on-primary">Slowest Tests</strong>{' '}
                  table lists the top 5 test cases with the highest average execution duration
                  across history.
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
              </div>
            )}

            {/* Modal Footer */}
            <div className="flex justify-end border-t border-border-default pt-3.5">
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="rounded-md bg-accent-blue px-4 py-2 text-xs font-bold text-white hover:bg-accent-blue/90 dark:bg-success-500 dark:text-slate-900 transition-colors cursor-pointer"
              >
                Close Guide
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
