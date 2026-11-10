import { useEffect, useMemo, useState } from 'react';
import { PageSizeControl } from '@/components/pagination/PageSizeControl';
import { PaginationFooter } from '@/components/pagination/PaginationFooter';
import { usePagination } from '@/components/pagination/usePagination';
import {
  ColumnDef,
  DataTable,
  ExportCsvButton,
  exportColumnsToCsv,
} from '@/components/shared/DataTable';
import { PassRateBadge } from '@/components/shared/PassRateBadge';
import { StatusCountBadge } from '@/components/shared/StatusCountBadge';
import DateFilterControl, { type DateFilterRange } from '@/components/shared/DateFilterControl';
import LearnMoreButton from '@/components/shared/LearnMoreButton';
import SearchInput from '@/components/shared/SearchInput';
import type { HistoryRun } from '@arpanp/zen-core';
import { formatDate, formatDuration } from '@arpanp/zen-core';
import { generateExportFilename } from '@arpanp/zen-core';
import { computePassRate } from '@arpanp/zen-core';

export interface HistoryRunsTableSectionProps {
  runs: HistoryRun[];
  availableTimestamps: string[];
  onOpenGuide: () => void;
  onSelectRun?: (runId: string) => void;
  selectedRunId?: string | null;
}

const sectionClass =
  'overflow-hidden rounded-md bg-surface-50 border border-border-default shadow-xs p-4';
const headingClass = 'text-lg font-bold text-text-ink dark:text-text-on-primary';

export function HistoryRunsTableSection({
  runs: rawRuns,
  availableTimestamps,
  onOpenGuide,
  onSelectRun,
  selectedRunId,
}: HistoryRunsTableSectionProps) {
  const [filterRange, setFilterRange] = useState<DateFilterRange>({
    fromTimestamp: null,
    toTimestamp: null,
    label: null,
  });
  const [runSearchTerm, setRunSearchTerm] = useState('');

  const isFiltered = Boolean(filterRange.fromTimestamp || filterRange.toTimestamp);

  const filteredRuns = useMemo(() => {
    return rawRuns.filter((run) => {
      const runTime = new Date(run.started_at).getTime();
      if (filterRange.fromTimestamp && runTime < filterRange.fromTimestamp) return false;
      if (filterRange.toTimestamp && runTime > filterRange.toTimestamp) return false;

      if (runSearchTerm.trim()) {
        const query = runSearchTerm.trim().toLowerCase();
        const nameMatch = Boolean(run.run_name && run.run_name.toLowerCase().includes(query));
        const branchMatch = Boolean(run.git_branch && run.git_branch.toLowerCase().includes(query));
        const commitMatch = Boolean(
          (run.git_commit && run.git_commit.toLowerCase().startsWith(query)) ||
          (run.git_commit_full && run.git_commit_full.toLowerCase().startsWith(query))
        );

        if (!nameMatch && !branchMatch && !commitMatch) {
          return false;
        }
      }

      return true;
    });
  }, [rawRuns, filterRange, runSearchTerm]);

  const runs = useMemo(() => [...filteredRuns].reverse(), [filteredRuns]);
  const runsPag = usePagination(runs.length, 10);

  // Automatically navigate to the page containing the selected run when selectedRunId changes
  const { pageSize, setPage } = runsPag;
  useEffect(() => {
    if (!selectedRunId || runs.length === 0) return;
    const activeIndex = runs.findIndex((r) => r.run_id === selectedRunId);
    if (activeIndex !== -1) {
      const targetPage = Math.floor(activeIndex / pageSize) + 1;
      setPage(targetPage);
    }
  }, [selectedRunId, runs, pageSize, setPage]);

  const runColumns: ColumnDef<(typeof runs)[0]>[] = useMemo(
    () => [
      {
        key: 'run_name',
        header: 'Run Name',
        className: 'font-bold text-text-ink dark:text-text-on-primary',
        cell: (run) => run.run_name,
        csvValue: (run) => run.run_name,
      },
      {
        key: 'branch',
        header: 'Branch',
        className: 'text-text-body-mid dark:text-text-muted',
        cell: (run) => {
          if (!run.git_branch) {
            return <span className="text-text-muted-soft dark:text-text-muted">—</span>;
          }
          return (
            <span
              className="inline-flex items-center gap-1 rounded-full bg-surface-100 dark:bg-surface-200 border border-border-default px-2 py-0.5 text-xs font-semibold text-text-ink dark:text-text-on-primary max-w-36 truncate shadow-2xs"
              title={`Branch: ${run.git_branch}${run.git_commit ? ` (${run.git_commit})` : ''}`}
            >
              <svg
                className="h-2.5 w-2.5 text-accent-blue shrink-0"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth="2.5"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M13.19 8.688a4.5 4.5 0 0 1 1.242 7.244l-4.5 4.5a4.5 4.5 0 0 1-6.364-6.364l1.757-1.757m13.35-.622 1.757-1.757a4.5 4.5 0 0 0-6.364-6.364l-4.5 4.5a4.5 4.5 0 0 0 1.242 7.244"
                />
              </svg>
              <span className="truncate">{run.git_branch}</span>
            </span>
          );
        },
        csvValue: (run) => run.git_branch ?? '',
      },
      {
        key: 'mode',
        header: 'Mode',
        className: 'font-medium text-text-body-mid dark:text-text-muted',
        cell: (run) =>
          !run.run_workers || run.run_workers <= 1
            ? 'Serial'
            : `Parallel, ${run.run_workers} workers`,
        csvValue: (run) =>
          !run.run_workers || run.run_workers <= 1
            ? 'Serial'
            : `Parallel, ${run.run_workers} workers`,
      },
      {
        key: 'started_at',
        header: (
          <span className="inline-flex items-center gap-1.5">
            <span>Started</span>
            {isFiltered && (
              <span
                className="inline-flex items-center gap-1 rounded bg-success-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-success-600 dark:bg-success-500/20 dark:text-success-400"
                title="Date range filter active on this column"
              >
                Filtered
              </span>
            )}
          </span>
        ),
        headerLabel: 'Started',
        cell: (run) => formatDate(run.started_at),
        csvValue: (run) => formatDate(run.started_at),
      },
      {
        key: 'duration',
        header: 'Duration',
        align: 'right',
        cell: (run) => formatDuration(run.run_duration_ms),
        csvValue: (run) => formatDuration(run.run_duration_ms),
      },
      {
        key: 'time_saved',
        header: 'Time Saved',
        align: 'right',
        cell: (run) => {
          const isParallel = Boolean(run.run_workers && run.run_workers > 1);
          const seqMs = run.run_sequential_duration_ms;
          const parMs = run.run_duration_ms;
          const hasSeqData = seqMs != null;
          const hasSavings = isParallel && hasSeqData && seqMs > parMs;
          const isOverhead = isParallel && hasSeqData && parMs > seqMs && seqMs > 0;
          const savedMs = hasSavings ? seqMs - parMs : 0;
          const overheadMs = isOverhead ? parMs - seqMs : 0;
          const speedupRatio = seqMs && seqMs > 0 ? seqMs / Math.max(1, parMs) : 1;
          const speedup = speedupRatio.toFixed(1);

          if (!isParallel)
            return <span className="text-text-body-mid dark:text-text-muted">0s</span>;
          if (!hasSeqData)
            return (
              <span
                title="Sequential duration data not available for this run"
                className="text-text-body-mid dark:text-text-muted"
              >
                —
              </span>
            );
          if (hasSavings)
            return (
              <span className="font-bold text-success-600 dark:text-success-500 whitespace-nowrap">
                ⚡ {formatDuration(savedMs)} ({speedup}x)
              </span>
            );
          if (isOverhead)
            return (
              <span className="font-semibold text-amber-600 dark:text-amber-500 whitespace-nowrap">
                ⚠️ +{formatDuration(overheadMs)} ({speedup}x)
              </span>
            );
          return <span className="text-text-body-mid dark:text-text-muted">0s</span>;
        },
        csvValue: (run) => {
          const isParallel = Boolean(run.run_workers && run.run_workers > 1);
          const seqMs = run.run_sequential_duration_ms;
          const parMs = run.run_duration_ms;
          const hasSeqData = seqMs != null;
          const hasSavings = isParallel && hasSeqData && seqMs > parMs;
          const isOverhead = isParallel && hasSeqData && parMs > seqMs && seqMs > 0;
          const savedMs = hasSavings ? seqMs - parMs : 0;
          const overheadMs = isOverhead ? parMs - seqMs : 0;
          const speedupRatio = seqMs && seqMs > 0 ? seqMs / Math.max(1, parMs) : 1;
          const speedup = speedupRatio.toFixed(1);

          if (!isParallel) return '0s';
          if (!hasSeqData) return '-';
          if (hasSavings) return `${formatDuration(savedMs)} (${speedup}x)`;
          if (isOverhead) return `+${formatDuration(overheadMs)} (${speedup}x)`;
          return '0s';
        },
      },
      {
        key: 'files',
        header: 'Files',
        align: 'center',
        className: 'font-medium',
        cell: (run) => run.run_files ?? '—',
        csvValue: (run) => run.run_files ?? '',
      },
      {
        key: 'total',
        header: 'Tests',
        align: 'center',
        className: 'font-medium',
        cell: (run) =>
          run.run_total === 0 ? (
            <StatusCountBadge count={0} type="failed" showZeroBadge={true} />
          ) : (
            run.run_total
          ),
        csvValue: (run) => run.run_total,
      },
      {
        key: 'passed',
        header: 'Passed',
        align: 'center',
        cell: (run) => <StatusCountBadge count={run.run_passed} type="passed" />,
        csvValue: (run) => run.run_passed,
      },
      {
        key: 'flaky',
        header: 'Flaky',
        align: 'center',
        cell: (run) => <StatusCountBadge count={run.run_flaky ?? 0} type="flaky" />,
        csvValue: (run) => run.run_flaky ?? 0,
      },
      {
        key: 'failed',
        header: 'Failed',
        align: 'center',
        cell: (run) => <StatusCountBadge count={run.run_failed} type="failed" />,
        csvValue: (run) => run.run_failed,
      },
      {
        key: 'skipped',
        header: 'Skipped',
        align: 'center',
        cell: (run) => <StatusCountBadge count={run.run_skipped} type="skipped" />,
        csvValue: (run) => run.run_skipped,
      },
      {
        key: 'timed_out',
        header: 'Timed Out',
        align: 'center',
        cell: (run) => <StatusCountBadge count={run.run_timed_out} type="timedOut" />,
        csvValue: (run) => run.run_timed_out,
      },
      {
        key: 'interrupted',
        header: 'Interrupted',
        align: 'center',
        cell: (run) => <StatusCountBadge count={run.run_interrupted} type="interrupted" />,
        csvValue: (run) => run.run_interrupted,
      },
      {
        key: 'pass_rate',
        header: 'Pass Rate',
        align: 'right',
        cell: (run) => {
          const passRate = computePassRate({
            total: run.run_total,
            passed: run.run_passed,
            flaky: run.run_flaky ?? 0,
            failed: run.run_failed,
            timedOut: run.run_timed_out,
            skipped: run.run_skipped,
            interrupted: run.run_interrupted,
            duration: run.run_duration_ms,
          });
          return <PassRateBadge passRate={passRate} />;
        },
        csvValue: (run) => {
          const passRate = computePassRate({
            total: run.run_total,
            passed: run.run_passed,
            flaky: run.run_flaky ?? 0,
            failed: run.run_failed,
            timedOut: run.run_timed_out,
            skipped: run.run_skipped,
            interrupted: run.run_interrupted,
            duration: run.run_duration_ms,
          });
          return `${passRate}%`;
        },
      },
      {
        key: 'actions',
        header: 'Report',
        align: 'center',
        cell: (run) => {
          const isCurrent = selectedRunId === run.run_id;
          return (
            <button
              type="button"
              onClick={() => onSelectRun?.(run.run_id)}
              disabled={isCurrent}
              title={isCurrent ? 'Currently viewing this run' : `View ${run.run_name} report`}
              className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-md transition-colors ${
                isCurrent
                  ? 'bg-surface-200 text-text-muted cursor-default'
                  : 'bg-surface-100 hover:bg-surface-200 text-accent-blue border border-border-default hover:border-accent-blue/40 shadow-2xs'
              }`}
            >
              <span>{isCurrent ? 'Viewing' : 'View Report'}</span>
              {!isCurrent && <span className="text-[10px]">↗</span>}
            </button>
          );
        },
        csvValue: () => '',
      },
    ],
    [isFiltered, selectedRunId, onSelectRun]
  );

  const pageRuns = runs.slice(runsPag.start, runsPag.start + runsPag.pageSize);

  return (
    <section className={sectionClass}>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-3 border-b border-border-default">
        <div>
          <div className="flex items-center gap-3">
            <h2 className={headingClass}>Execution Runs History</h2>
            <LearnMoreButton onClick={onOpenGuide} />
          </div>
          <p className="mt-1 text-xs text-text-body-mid dark:text-text-muted">
            Audit log of recorded test runs with performance, duration, and outcome metrics
          </p>
        </div>
        {rawRuns.length > 0 && runs.length > 0 && (
          <PageSizeControl
            id="runs-page-size"
            pageSize={runsPag.pageSize}
            onPageSizeChange={runsPag.changePageSize}
            totalItems={runs.length}
          />
        )}
      </div>

      {rawRuns.length > 0 && (
        <div className="pt-3 pb-3 border-b border-border-default flex flex-col gap-3">
          <DateFilterControl
            onFilterChange={(range) => {
              setFilterRange(range);
              runsPag.setPage(1);
            }}
            availableTimestamps={availableTimestamps}
          />
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <SearchInput
              value={runSearchTerm}
              onChange={(val) => {
                setRunSearchTerm(val);
                runsPag.setPage(1);
              }}
              placeholder="Search test runs by name, branch, or commit..."
              className="w-full sm:w-80 md:w-96"
            />
            {runs.length > 0 && (
              <ExportCsvButton
                onClick={() =>
                  exportColumnsToCsv(
                    () =>
                      generateExportFilename('test_runs_history', {
                        dateRange: filterRange,
                        searchTerm: runSearchTerm,
                      }),
                    runs,
                    runColumns
                  )
                }
                count={runs.length}
              />
            )}
          </div>
        </div>
      )}

      <DataTable
        data={pageRuns}
        columns={runColumns}
        getRowKey={(run) => run.run_id}
        getRowClassName={(run) =>
          selectedRunId === run.run_id
            ? 'bg-accent-blue/5 dark:bg-accent-blue/10 border-l-4 border-l-accent-blue'
            : ''
        }
        exportFilename={() =>
          generateExportFilename('test_runs_history', {
            dateRange: filterRange,
            searchTerm: runSearchTerm,
          })
        }
        fullData={runs}
        hideExportButton
        className="mt-4"
        emptyMessage={
          <div className="py-16 text-center text-text-body-mid dark:text-text-muted">
            <p className="text-base font-semibold">No matching test runs found</p>
            <p className="mt-1 text-xs text-text-muted-soft">
              Try adjusting or clearing your date range or search filter criteria.
            </p>
          </div>
        }
      />

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
  );
}
