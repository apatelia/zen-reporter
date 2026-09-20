import { useState } from 'react';
import type { HistoryData } from '@/lib/types';
import { formatDate, formatDuration } from '@/lib/utils';
import { usePagination, PageSizeControl, PaginationFooter } from '@/components/pagination';
import { LearnMoreButton } from '@/components/shared';

interface Props {
  history: HistoryData | null;
}

const th = 'px-3 py-3 text-left font-bold text-text-ink dark:text-text-on-primary';
const thNum = 'px-3 py-3 text-right font-bold text-text-ink dark:text-text-on-primary';
const td = 'px-3 py-3 text-text-ink dark:text-text-on-primary tabular-nums';
const tdNum = 'px-3 py-3 text-right text-text-ink dark:text-text-on-primary tabular-nums';

const sectionClass = 'rounded-md border border-border-default bg-surface-50 p-6 shadow-xs';
const headingClass = 'text-xl font-bold text-text-ink dark:text-text-on-primary';

export default function HistorySection({ history }: Props) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const runsPag = usePagination(history?.runs.length ?? 0);

  if (!history) {
    return (
      <div className="flex items-center justify-center py-24 text-center">
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
            after your test runs to populate this tab.
          </p>
        </div>
      </div>
    );
  }

  const runs = [...history.runs].reverse();
  const pageRuns = runs.slice(runsPag.start, runsPag.start + runsPag.pageSize);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-text-ink dark:text-text-on-primary sm:text-3xl">
            Execution Run History
          </h2>
          <p className="mt-1.5 text-sm text-text-body-mid dark:text-text-muted">
            Audit log of all historical test execution runs stored in Zen Reporter
          </p>
        </div>
      </div>

      <section className={sectionClass}>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border-default pb-4">
          <div className="flex items-center gap-3">
            <h2 className={headingClass}>Test runs audit log</h2>
            <LearnMoreButton onClick={() => setIsModalOpen(true)} />
          </div>
          <PageSizeControl
            id="runs-page-size"
            pageSize={runsPag.pageSize}
            onPageSizeChange={runsPag.changePageSize}
          />
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b-2 border-border-default bg-surface-100/50 dark:bg-surface-100/30">
                <th className={th}>Run Name</th>
                <th className={th}>Mode</th>
                <th className={th}>Started</th>
                <th className={thNum}>Duration</th>
                <th className={thNum}>Time Saved</th>
                <th className={thNum}>Total</th>
                <th className={thNum}>Passed</th>
                <th className={thNum}>Failed</th>
                <th className={thNum}>Skipped</th>
                <th className={thNum}>Timed Out</th>
                <th className={thNum}>Interrupted</th>
                <th className={thNum}>Pass Rate</th>
              </tr>
            </thead>
            <tbody>
              {pageRuns.map((run) => {
                const isParallel = Boolean(run.run_workers && run.run_workers > 1);
                const seqMs = run.run_sequential_duration_ms;
                const hasSeqData = seqMs != null;
                const savedMs =
                  isParallel && hasSeqData && seqMs > run.run_duration_ms
                    ? seqMs - run.run_duration_ms
                    : 0;
                const speedup =
                  isParallel && hasSeqData && savedMs > 0
                    ? (seqMs / Math.max(1, run.run_duration_ms)).toFixed(1)
                    : null;

                return (
                  <tr
                    key={run.run_id}
                    className="border-b border-border-default hover:bg-surface-100/60 dark:hover:bg-surface-200/40 transition-colors"
                  >
                    <td className={`${td} font-bold text-text-ink dark:text-text-on-primary`}>
                      {run.run_name}
                    </td>
                    <td className={`${td} font-medium text-text-body-mid dark:text-text-muted`}>
                      {!run.run_workers || run.run_workers <= 1
                        ? 'Serial'
                        : `Parallel, ${run.run_workers} workers`}
                    </td>
                    <td className={td}>{formatDate(run.started_at)}</td>
                    <td className={tdNum}>{formatDuration(run.run_duration_ms)}</td>
                    <td className={tdNum}>
                      {!isParallel ? (
                        <span className="text-text-body-mid dark:text-text-muted">0s</span>
                      ) : !hasSeqData ? (
                        <span
                          title="Sequential duration data not available for this run"
                          className="text-text-body-mid dark:text-text-muted"
                        >
                          —
                        </span>
                      ) : savedMs > 0 && speedup ? (
                        <span className="font-bold text-success-600 dark:text-success-500 whitespace-nowrap">
                          ⚡ {formatDuration(savedMs)} ({speedup}x)
                        </span>
                      ) : (
                        <span className="text-text-body-mid dark:text-text-muted">0s</span>
                      )}
                    </td>
                    <td className={`${tdNum} font-medium`}>{run.run_total}</td>
                    <td
                      className={`${tdNum} ${run.run_passed > 0 ? 'text-success-600 dark:text-success-500 font-bold' : ''}`}
                    >
                      {run.run_passed}
                    </td>
                    <td
                      className={`${tdNum} ${run.run_failed > 0 ? 'text-danger-600 dark:text-danger-500 font-bold' : ''}`}
                    >
                      {run.run_failed}
                    </td>
                    <td
                      className={`${tdNum} ${run.run_skipped > 0 ? 'text-text-body-mid dark:text-text-muted font-medium' : ''}`}
                    >
                      {run.run_skipped}
                    </td>
                    <td
                      className={`${tdNum} ${run.run_timed_out > 0 ? 'text-danger-600 dark:text-danger-500 font-bold' : ''}`}
                    >
                      {run.run_timed_out}
                    </td>
                    <td
                      className={`${tdNum} ${run.run_interrupted > 0 ? 'text-warning-600 dark:text-warning-500 font-bold' : ''}`}
                    >
                      {run.run_interrupted}
                    </td>
                    <td className={tdNum}>
                      {run.pass_rate === null ? (
                        '-'
                      ) : (
                        <span
                          className={`inline-block px-2 py-0.5 rounded font-bold ${
                            run.pass_rate >= 90
                              ? 'bg-success-50 text-success-700 dark:bg-success-500/20 dark:text-success-500'
                              : run.pass_rate >= 60
                                ? 'bg-warning-50 text-warning-700 dark:bg-warning-500/20 dark:text-warning-500'
                                : 'bg-danger-50 text-danger-700 dark:bg-danger-500/20 dark:text-danger-500'
                          }`}
                        >
                          {run.pass_rate}%
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <PaginationFooter
          label="runs"
          total={runs.length}
          start={runsPag.start}
          pageLength={pageRuns.length}
          currentPage={runsPag.currentPage}
          totalPages={runsPag.totalPages}
          onPageChange={runsPag.setPage}
        />
      </section>

      {/* Interactive Modal Guide */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="relative w-full max-w-2xl rounded-lg border border-border-default bg-canvas p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-border-default pb-3.5">
              <div>
                <h3 className="text-xl font-bold text-text-ink dark:text-text-on-primary">
                  Historical Test Runs Guide
                </h3>
                <p className="mt-1 text-xs text-text-body-mid dark:text-text-muted">
                  Column definitions, worker execution modes, and quality health thresholds
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
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

            {/* Modal Content */}
            <div className="space-y-4 text-xs text-text-body-mid dark:text-text-muted leading-relaxed">
              <p>
                The{' '}
                <strong className="text-text-ink dark:text-text-on-primary">
                  Test Runs Audit Log
                </strong>{' '}
                provides a complete historical record of every test suite execution processed and
                saved in Zen Reporter's run store.
              </p>
              <div className="rounded-md border border-border-default bg-surface-50 p-4 space-y-2">
                <div className="font-bold text-text-ink dark:text-text-on-primary text-xs uppercase tracking-wider">
                  Table Column Definitions:
                </div>
                <ul className="list-disc list-inside space-y-1">
                  <li>
                    <strong>Mode:</strong> Indicates whether the run executed sequentially (Serial)
                    or concurrently across multiple worker processes (`--workers`).
                  </li>
                  <li>
                    <strong>Duration:</strong> Total wall-clock execution time elapsed for the test
                    run.
                  </li>
                  <li>
                    <strong>Time Saved:</strong> Difference between cumulative test execution time
                    (sequential effort) and actual wall-clock duration when running in parallel mode
                    (e.g. ⚡ 3m 45s saved with 4x speedup).
                  </li>
                  <li>
                    <strong>Status Breakdown:</strong> Counts for Passed, Failed, Skipped, Timed
                    Out, and Interrupted test outcomes.
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
            </div>

            {/* Modal Footer */}
            <div className="flex justify-end border-t border-border-default pt-3.5">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="rounded-md bg-accent-blue px-4 py-2 text-xs font-bold text-text-on-primary hover:bg-accent-blue/90 transition-colors cursor-pointer"
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
