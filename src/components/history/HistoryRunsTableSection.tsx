import { useMemo, useState } from 'react';
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
import type { HistoryRun } from '@/lib/types/history';
import { formatDate, formatDuration } from '@/lib/formatters';
import { generateExportFilename } from '@/lib/exportFilename';
import { computePassRate } from '@/lib/statsUtils';

export interface HistoryRunsTableSectionProps {
  runs: HistoryRun[];
  availableTimestamps: string[];
  onOpenGuide: () => void;
}

const sectionClass =
  'overflow-hidden rounded-md bg-canvas border border-border-default shadow-sm p-4';
const headingClass = 'text-lg font-bold text-text-ink dark:text-text-on-primary';

export function HistoryRunsTableSection({
  runs: rawRuns,
  availableTimestamps,
  onOpenGuide,
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
        if (!run.run_name || !run.run_name.toLowerCase().includes(query)) {
          return false;
        }
      }

      return true;
    });
  }, [rawRuns, filterRange, runSearchTerm]);

  const runs = useMemo(() => [...filteredRuns].reverse(), [filteredRuns]);
  const runsPag = usePagination(runs.length, 10);

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
        key: 'total',
        header: 'Total',
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
            failed: run.run_failed,
            timedOut: run.run_timed_out,
            skipped: run.run_skipped,
            interrupted: run.run_interrupted,
            duration: run.run_duration_ms,
          });
          return `${passRate}%`;
        },
      },
    ],
    [isFiltered]
  );

  const pageRuns = runs.slice(runsPag.start, runsPag.start + runsPag.pageSize);

  return (
    <section className={sectionClass}>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-3 border-b border-border-default">
        <div className="flex items-center gap-3">
          <h2 className={headingClass}>Execution Runs History</h2>
          <LearnMoreButton onClick={onOpenGuide} />
        </div>
        {rawRuns.length > 0 && runs.length > 0 && (
          <PageSizeControl
            id="runs-page-size"
            pageSize={runsPag.pageSize}
            onPageSizeChange={runsPag.changePageSize}
          />
        )}
      </div>

      {rawRuns.length > 0 && (
        <div className="pt-3 pb-3 border-b border-border-default/50 flex flex-col gap-3">
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
              placeholder="Search test runs by run name..."
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
