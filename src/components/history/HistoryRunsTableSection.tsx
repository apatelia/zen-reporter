import { useMemo, useState } from 'react';
import { PageSizeControl } from '@/components/pagination/PageSizeControl';
import { PaginationFooter } from '@/components/pagination/PaginationFooter';
import { usePagination } from '@/components/pagination/usePagination';
import { ColumnDef, DataTable, PassRateBadge } from '@/components/shared/DataTable';
import DateFilterControl, { type DateFilterRange } from '@/components/shared/DateFilterControl';
import LearnMoreButton from '@/components/shared/LearnMoreButton';
import type { HistoryRun } from '@/lib/types/history';
import { formatDate, formatDuration } from '@/lib/formatters';

export interface HistoryRunsTableSectionProps {
  runs: HistoryRun[];
  availableTimestamps: string[];
  onOpenGuide: () => void;
}

const sectionClass = 'rounded-md border border-border-default bg-surface-50 p-6 shadow-xs';
const headingClass = 'text-xl font-bold text-text-ink dark:text-text-on-primary';

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

  const filteredRuns = useMemo(() => {
    if (!filterRange.fromTimestamp && !filterRange.toTimestamp) return rawRuns;

    return rawRuns.filter((run) => {
      const runTime = new Date(run.started_at).getTime();
      if (filterRange.fromTimestamp && runTime < filterRange.fromTimestamp) return false;
      if (filterRange.toTimestamp && runTime > filterRange.toTimestamp) return false;
      return true;
    });
  }, [rawRuns, filterRange]);

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
        header: 'Started',
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
          const hasSeqData = seqMs != null;
          const savedMs =
            isParallel && hasSeqData && seqMs > run.run_duration_ms
              ? seqMs - run.run_duration_ms
              : 0;
          const speedup =
            isParallel && hasSeqData && savedMs > 0
              ? (seqMs / Math.max(1, run.run_duration_ms)).toFixed(1)
              : null;

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
          if (savedMs > 0 && speedup)
            return (
              <span className="font-bold text-success-600 dark:text-success-500 whitespace-nowrap">
                ⚡ {formatDuration(savedMs)} ({speedup}x)
              </span>
            );
          return <span className="text-text-body-mid dark:text-text-muted">0s</span>;
        },
        csvValue: (run) => {
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

          if (!isParallel) return '0s';
          if (!hasSeqData) return '-';
          if (savedMs > 0 && speedup) return `${formatDuration(savedMs)} (${speedup}x)`;
          return '0s';
        },
      },
      {
        key: 'total',
        header: 'Total',
        align: 'right',
        className: 'font-medium',
        cell: (run) => run.run_total,
        csvValue: (run) => run.run_total,
      },
      {
        key: 'passed',
        header: 'Passed',
        align: 'right',
        cell: (run) => (
          <span
            className={run.run_passed > 0 ? 'text-success-600 dark:text-success-500 font-bold' : ''}
          >
            {run.run_passed}
          </span>
        ),
        csvValue: (run) => run.run_passed,
      },
      {
        key: 'failed',
        header: 'Failed',
        align: 'right',
        cell: (run) => (
          <span
            className={run.run_failed > 0 ? 'text-danger-600 dark:text-danger-500 font-bold' : ''}
          >
            {run.run_failed}
          </span>
        ),
        csvValue: (run) => run.run_failed,
      },
      {
        key: 'skipped',
        header: 'Skipped',
        align: 'right',
        cell: (run) => (
          <span
            className={
              run.run_skipped > 0 ? 'text-text-body-mid dark:text-text-muted font-medium' : ''
            }
          >
            {run.run_skipped}
          </span>
        ),
        csvValue: (run) => run.run_skipped,
      },
      {
        key: 'timed_out',
        header: 'Timed Out',
        align: 'right',
        cell: (run) => (
          <span
            className={
              run.run_timed_out > 0 ? 'text-danger-600 dark:text-danger-500 font-bold' : ''
            }
          >
            {run.run_timed_out}
          </span>
        ),
        csvValue: (run) => run.run_timed_out,
      },
      {
        key: 'interrupted',
        header: 'Interrupted',
        align: 'right',
        cell: (run) => (
          <span
            className={
              run.run_interrupted > 0 ? 'text-warning-600 dark:text-warning-500 font-bold' : ''
            }
          >
            {run.run_interrupted}
          </span>
        ),
        csvValue: (run) => run.run_interrupted,
      },
      {
        key: 'pass_rate',
        header: 'Pass Rate',
        align: 'right',
        cell: (run) => <PassRateBadge passRate={run.pass_rate} />,
        csvValue: (run) => (run.pass_rate != null ? `${run.pass_rate}%` : '-'),
      },
    ],
    []
  );

  const pageRuns = runs.slice(runsPag.start, runsPag.start + runsPag.pageSize);

  return (
    <section className={sectionClass}>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-3 border-b border-border-default">
        <div className="flex items-center gap-3">
          <h2 className={headingClass}>Test runs audit log</h2>
          <LearnMoreButton onClick={onOpenGuide} />
        </div>
        <PageSizeControl
          id="runs-page-size"
          pageSize={runsPag.pageSize}
          onPageSizeChange={runsPag.changePageSize}
        />
      </div>

      <div className="pt-3 pb-1 border-b border-border-default/50">
        <DateFilterControl
          onFilterChange={(range) => {
            setFilterRange(range);
            runsPag.setPage(1);
          }}
          availableTimestamps={availableTimestamps}
        />
      </div>

      <DataTable
        data={pageRuns}
        columns={runColumns}
        getRowKey={(run) => run.run_id}
        exportFilename="test_runs_history.csv"
        fullData={runs}
        className="mt-4"
        emptyMessage={
          <div className="py-16 text-center text-text-body-mid dark:text-text-muted">
            <p className="text-base font-semibold">No matching test runs found</p>
            <p className="mt-1 text-xs text-text-muted-soft">
              Try adjusting or clearing your date range filter criteria.
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
