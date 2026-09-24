import { useState, useMemo } from 'react';
import HistoryGuides from './HistoryGuides';
import type { HistoryData } from '@/lib/types';
import { formatDate, formatDuration, truncateFileName } from '@/lib/utils';
import { usePagination, PageSizeControl, PaginationFooter } from '@/components/pagination';
import {
  LearnMoreButton,
  HistoryDisabledBanner,
  DateFilterControl,
  DataTable,
  PassRateBadge,
  SearchInput,
  type ColumnDef,
  type DateFilterRange,
} from '@/components/shared';

interface Props {
  history: HistoryData | null;
  isHistoryDisabled?: boolean;
}

const sectionClass = 'rounded-md border border-border-default bg-surface-50 p-6 shadow-xs';
const headingClass = 'text-xl font-bold text-text-ink dark:text-text-on-primary';

export default function HistorySection({ history, isHistoryDisabled }: Props) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isFileModalOpen, setIsFileModalOpen] = useState(false);
  const [filterRange, setFilterRange] = useState<DateFilterRange>({
    fromTimestamp: null,
    toTimestamp: null,
    label: null,
  });
  const [fileFilterRange, setFileFilterRange] = useState<DateFilterRange>({
    fromTimestamp: null,
    toTimestamp: null,
    label: null,
  });
  const [fileNameSearchTerm, setFileNameSearchTerm] = useState('');
  const [isTestModalOpen, setIsTestModalOpen] = useState(false);
  const [testFilterRange, setTestFilterRange] = useState<DateFilterRange>({
    fromTimestamp: null,
    toTimestamp: null,
    label: null,
  });
  const [testSearchTerm, setTestSearchTerm] = useState('');

  const availableTimestamps = useMemo(
    () => history?.runs.map((r) => r.started_at) ?? [],
    [history]
  );

  const filteredRuns = useMemo(() => {
    if (!history) return [];
    if (!filterRange.fromTimestamp && !filterRange.toTimestamp) return history.runs;

    return history.runs.filter((run) => {
      const runTime = new Date(run.started_at).getTime();
      if (filterRange.fromTimestamp && runTime < filterRange.fromTimestamp) return false;
      if (filterRange.toTimestamp && runTime > filterRange.toTimestamp) return false;
      return true;
    });
  }, [history, filterRange]);

  const runs = useMemo(() => [...filteredRuns].reverse(), [filteredRuns]);
  const runsPag = usePagination(runs.length, 10);

  const aggregatedFiles = useMemo(() => {
    if (!history) return [];
    const rawFiles = history.files ?? [];

    const filtered = rawFiles.filter((row) => {
      const rowTime = new Date(row.started_at).getTime();
      if (fileFilterRange.fromTimestamp && rowTime < fileFilterRange.fromTimestamp) return false;
      if (fileFilterRange.toTimestamp && rowTime > fileFilterRange.toTimestamp) return false;
      if (
        fileNameSearchTerm.trim() &&
        !row.file.toLowerCase().includes(fileNameSearchTerm.trim().toLowerCase())
      ) {
        return false;
      }
      return true;
    });

    const map = new Map<
      string,
      {
        file: string;
        total: number;
        passed: number;
        failed: number;
        timedOut: number;
        interrupted: number;
        skipped: number;
        runIds: Set<string>;
      }
    >();

    for (const row of filtered) {
      let item = map.get(row.file);
      if (!item) {
        item = {
          file: row.file,
          total: 0,
          passed: 0,
          failed: 0,
          timedOut: 0,
          interrupted: 0,
          skipped: 0,
          runIds: new Set<string>(),
        };
        map.set(row.file, item);
      }
      item.total += row.total;
      item.passed += row.passed;
      item.failed += row.failed;
      item.timedOut += row.timed_out;
      item.interrupted += row.interrupted;
      item.skipped += row.skipped;
      if (row.run_id) {
        item.runIds.add(row.run_id);
      }
    }

    return Array.from(map.values())
      .map((item) => {
        const total = item.total;
        const passRate = total > 0 ? Math.round((item.passed / total) * 100) : null;
        return {
          file: item.file,
          runsCount: item.runIds.size || 1,
          total,
          passed: item.passed,
          failed: item.failed,
          timedOut: item.timedOut,
          interrupted: item.interrupted,
          skipped: item.skipped,
          passRate,
        };
      })
      .sort((a, b) => b.total - a.total || a.file.localeCompare(b.file));
  }, [history, fileFilterRange, fileNameSearchTerm]);

  const filesPag = usePagination(aggregatedFiles.length, 10);

  const aggregatedTests = useMemo(() => {
    if (!history) return [];
    let rawTests = history.tests;
    if (!rawTests || rawTests.length === 0) {
      rawTests = [
        ...(history.flaky ?? []).map((f) => ({
          started_at: history.generated_at,
          suite: f.suite,
          file: f.file,
          title: f.title,
          project: f.project,
          total: f.total_runs,
          passed: f.passed_runs,
          failed: f.failed_runs,
          timed_out: 0,
          interrupted: 0,
          skipped: 0,
        })),
        ...(history.slowest ?? []).map((s) => ({
          started_at: history.generated_at,
          suite: s.suite,
          file: s.file,
          title: s.title,
          project: s.project,
          total: s.runs,
          passed: s.runs,
          failed: 0,
          timed_out: 0,
          interrupted: 0,
          skipped: 0,
          avg_duration_ms: s.avg_duration_ms ?? s.avg_ms,
        })),
      ];
    }

    const filtered = rawTests.filter((row) => {
      const rowTime = new Date(row.started_at).getTime();
      if (testFilterRange.fromTimestamp && rowTime < testFilterRange.fromTimestamp) return false;
      if (testFilterRange.toTimestamp && rowTime > testFilterRange.toTimestamp) return false;

      if (testSearchTerm.trim()) {
        const query = testSearchTerm.trim().toLowerCase();
        const matchesVisibleColumns =
          (row.title && row.title.toLowerCase().includes(query)) ||
          (row.suite && row.suite.toLowerCase().includes(query)) ||
          (row.file && row.file.toLowerCase().includes(query)) ||
          (row.project && row.project.toLowerCase().includes(query));
        if (!matchesVisibleColumns) return false;
      }

      return true;
    });

    const map = new Map<
      string,
      {
        key: string;
        title: string;
        suite: string;
        file: string;
        project: string;
        total: number;
        passed: number;
        failed: number;
        timedOut: number;
        interrupted: number;
        skipped: number;
        totalDurationMs: number;
        durationCount: number;
        runIds: Set<string>;
      }
    >();

    for (const row of filtered) {
      const key = `${row.project || ''}:::${row.file || ''}:::${row.suite || ''}:::${row.title || ''}`;
      let item = map.get(key);
      if (!item) {
        item = {
          key,
          title: row.title,
          suite: row.suite || '',
          file: row.file || '',
          project: row.project || '',
          total: 0,
          passed: 0,
          failed: 0,
          timedOut: 0,
          interrupted: 0,
          skipped: 0,
          totalDurationMs: 0,
          durationCount: 0,
          runIds: new Set<string>(),
        };
        map.set(key, item);
      }
      item.total += row.total ?? 1;
      item.passed += row.passed ?? 0;
      item.failed += row.failed ?? 0;
      item.timedOut += row.timed_out ?? 0;
      item.interrupted += row.interrupted ?? 0;
      item.skipped += row.skipped ?? 0;
      if (row.avg_duration_ms != null) {
        item.totalDurationMs += row.avg_duration_ms;
        item.durationCount += 1;
      }
      if (row.run_id) {
        item.runIds.add(row.run_id);
      }
    }

    return Array.from(map.values())
      .map((item) => {
        const total = item.total;
        const passRate = total > 0 ? Math.round((item.passed / total) * 100) : null;
        const avgDurationMs =
          item.durationCount > 0 ? Math.round(item.totalDurationMs / item.durationCount) : null;
        return {
          key: item.key,
          title: item.title,
          suite: item.suite,
          file: item.file,
          project: item.project,
          runsCount: item.runIds.size || 1,
          total,
          passed: item.passed,
          failed: item.failed,
          timedOut: item.timedOut,
          interrupted: item.interrupted,
          skipped: item.skipped,
          avgDurationMs,
          passRate,
        };
      })
      .sort((a, b) => b.total - a.total || a.title.localeCompare(b.title));
  }, [history, testFilterRange, testSearchTerm]);

  const testsPag = usePagination(aggregatedTests.length, 10);

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

  const fileColumns: ColumnDef<(typeof aggregatedFiles)[0]>[] = useMemo(
    () => [
      {
        key: 'file',
        header: 'Spec File',
        cell: (f) => (
          <div
            className="max-w-xs sm:max-w-md overflow-hidden text-ellipsis whitespace-nowrap font-medium text-text-ink dark:text-text-on-primary"
            title={f.file}
          >
            {truncateFileName(f.file)}
          </div>
        ),
        csvValue: (f) => f.file,
      },
      {
        key: 'runs',
        header: 'Runs',
        align: 'right',
        className: 'text-text-body-mid dark:text-text-muted',
        cell: (f) => f.runsCount,
        csvValue: (f) => f.runsCount,
      },
      {
        key: 'total',
        header: 'Total Tests',
        align: 'right',
        className: 'font-medium',
        cell: (f) => f.total,
        csvValue: (f) => f.total,
      },
      {
        key: 'passed',
        header: 'Passed',
        align: 'right',
        cell: (f) => (
          <span className={f.passed > 0 ? 'text-success-600 dark:text-success-500 font-bold' : ''}>
            {f.passed}
          </span>
        ),
        csvValue: (f) => f.passed,
      },
      {
        key: 'failed',
        header: 'Failed',
        align: 'right',
        cell: (f) => (
          <span className={f.failed > 0 ? 'text-danger-600 dark:text-danger-500 font-bold' : ''}>
            {f.failed}
          </span>
        ),
        csvValue: (f) => f.failed,
      },
      {
        key: 'timed_out',
        header: 'Timed Out',
        align: 'right',
        cell: (f) => (
          <span className={f.timedOut > 0 ? 'text-danger-600 dark:text-danger-500 font-bold' : ''}>
            {f.timedOut}
          </span>
        ),
        csvValue: (f) => f.timedOut,
      },
      {
        key: 'interrupted',
        header: 'Interrupted',
        align: 'right',
        cell: (f) => (
          <span
            className={f.interrupted > 0 ? 'text-warning-600 dark:text-warning-500 font-bold' : ''}
          >
            {f.interrupted}
          </span>
        ),
        csvValue: (f) => f.interrupted,
      },
      {
        key: 'skipped',
        header: 'Skipped',
        align: 'right',
        cell: (f) => (
          <span
            className={f.skipped > 0 ? 'text-text-body-mid dark:text-text-muted font-medium' : ''}
          >
            {f.skipped}
          </span>
        ),
        csvValue: (f) => f.skipped,
      },
      {
        key: 'pass_rate',
        header: 'Pass Rate',
        align: 'right',
        cell: (f) => <PassRateBadge passRate={f.passRate} />,
        csvValue: (f) => (f.passRate != null ? `${f.passRate}%` : '-'),
      },
    ],
    []
  );

  const testColumns: ColumnDef<(typeof aggregatedTests)[0]>[] = useMemo(
    () => [
      {
        key: 'test',
        header: 'Test',
        className: 'font-bold text-text-ink dark:text-text-on-primary',
        cell: (t) => t.title,
        csvValue: (t) => t.title,
      },
      {
        key: 'suite',
        header: 'Suite',
        cell: (t) => t.suite || '-',
        csvValue: (t) => t.suite || '',
      },
      {
        key: 'file',
        header: 'Spec File',
        cell: (t) => (
          <div
            className="max-w-xs overflow-hidden text-ellipsis whitespace-nowrap font-medium text-text-ink dark:text-text-on-primary"
            title={t.file}
          >
            {truncateFileName(t.file)}
          </div>
        ),
        csvValue: (t) => t.file,
      },
      {
        key: 'project',
        header: 'Project',
        cell: (t) => t.project || '-',
        csvValue: (t) => t.project || '',
      },
      {
        key: 'runs',
        header: 'Runs',
        align: 'right',
        className: 'text-text-body-mid dark:text-text-muted',
        cell: (t) => t.runsCount,
        csvValue: (t) => t.runsCount,
      },
      {
        key: 'passed',
        header: 'Passed',
        align: 'right',
        cell: (t) => (
          <span className={t.passed > 0 ? 'text-success-600 dark:text-success-500 font-bold' : ''}>
            {t.passed}
          </span>
        ),
        csvValue: (t) => t.passed,
      },
      {
        key: 'failed',
        header: 'Failed',
        align: 'right',
        cell: (t) => (
          <span className={t.failed > 0 ? 'text-danger-600 dark:text-danger-500 font-bold' : ''}>
            {t.failed}
          </span>
        ),
        csvValue: (t) => t.failed,
      },
      {
        key: 'timed_out',
        header: 'Timed Out',
        align: 'right',
        cell: (t) => (
          <span className={t.timedOut > 0 ? 'text-danger-600 dark:text-danger-500 font-bold' : ''}>
            {t.timedOut}
          </span>
        ),
        csvValue: (t) => t.timedOut,
      },
      {
        key: 'interrupted',
        header: 'Interrupted',
        align: 'right',
        cell: (t) => (
          <span
            className={t.interrupted > 0 ? 'text-warning-600 dark:text-warning-500 font-bold' : ''}
          >
            {t.interrupted}
          </span>
        ),
        csvValue: (t) => t.interrupted,
      },
      {
        key: 'skipped',
        header: 'Skipped',
        align: 'right',
        cell: (t) => (
          <span
            className={t.skipped > 0 ? 'text-text-body-mid dark:text-text-muted font-medium' : ''}
          >
            {t.skipped}
          </span>
        ),
        csvValue: (t) => t.skipped,
      },
      {
        key: 'avg_duration',
        header: 'Avg Duration',
        align: 'right',
        cell: (t) => (t.avgDurationMs != null ? formatDuration(t.avgDurationMs) : '-'),
        csvValue: (t) => (t.avgDurationMs != null ? formatDuration(t.avgDurationMs) : '-'),
      },
      {
        key: 'pass_rate',
        header: 'Pass Rate',
        align: 'right',
        cell: (t) => <PassRateBadge passRate={t.passRate} />,
        csvValue: (t) => (t.passRate != null ? `${t.passRate}%` : '-'),
      },
    ],
    []
  );

  if (!history) {
    return (
      <div className="space-y-6">
        {isHistoryDisabled && <HistoryDisabledBanner />}
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
      </div>
    );
  }

  const pageRuns = runs.slice(runsPag.start, runsPag.start + runsPag.pageSize);
  const pageFiles = aggregatedFiles.slice(filesPag.start, filesPag.start + filesPag.pageSize);
  const pageTests = aggregatedTests.slice(testsPag.start, testsPag.start + testsPag.pageSize);

  return (
    <div className="space-y-6">
      {isHistoryDisabled && <HistoryDisabledBanner />}
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
        {/* Row 1: Section Title & Page Size Control */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-3 border-b border-border-default">
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

        {/* Row 2: Dedicated Date Filter Toolbar */}
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

      {/* Spec Files Breakdown / File History Section */}
      <section className={sectionClass}>
        {/* Row 1: Section Title & Page Size Control */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-3 border-b border-border-default">
          <div>
            <div className="flex items-center gap-3">
              <h2 className={headingClass}>File History</h2>
              <LearnMoreButton onClick={() => setIsFileModalOpen(true)} />
            </div>
            <p className="mt-1 text-xs text-text-body-mid dark:text-text-muted">
              Spec files test execution breakdown across test runs
            </p>
          </div>
          <PageSizeControl
            id="files-history-page-size"
            pageSize={filesPag.pageSize}
            onPageSizeChange={filesPag.changePageSize}
          />
        </div>

        {/* Row 2: Dedicated Date Filter Toolbar & Search Filter */}
        <div className="pt-3 pb-1 border-b border-border-default/50 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <DateFilterControl
            onFilterChange={(range) => {
              setFileFilterRange(range);
              filesPag.setPage(1);
            }}
            availableTimestamps={availableTimestamps}
          />
          <SearchInput
            value={fileNameSearchTerm}
            onChange={(val) => {
              setFileNameSearchTerm(val);
              filesPag.setPage(1);
            }}
            placeholder="Search spec files..."
            className="w-44 sm:w-48 shrink-0"
            inputClassName="w-full rounded-md border border-border-default bg-surface-50 pl-9 pr-7 py-1.5 text-xs text-text-ink placeholder:text-text-muted focus:border-accent-blue focus:outline-none dark:bg-surface-50 dark:text-text-on-primary"
          />
        </div>

        <DataTable
          data={pageFiles}
          columns={fileColumns}
          getRowKey={(f) => f.file}
          exportFilename="spec_file_history.csv"
          fullData={aggregatedFiles}
          className="mt-4"
          emptyMessage={
            <div className="py-16 text-center text-text-body-mid dark:text-text-muted">
              <p className="text-base font-semibold">No matching file history found</p>
              <p className="mt-1 text-xs text-text-muted-soft">
                Try adjusting or clearing your date range filter criteria.
              </p>
            </div>
          }
        />

        <PaginationFooter
          label="spec files"
          total={aggregatedFiles.length}
          start={filesPag.start}
          pageLength={pageFiles.length}
          currentPage={filesPag.currentPage}
          totalPages={filesPag.totalPages}
          onPageChange={filesPag.setPage}
        />
      </section>

      {/* Test History Section */}
      <section className={sectionClass}>
        {/* Row 1: Section Title & Page Size Control */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-3 border-b border-border-default">
          <div>
            <div className="flex items-center gap-3">
              <h2 className={headingClass}>Test History</h2>
              <LearnMoreButton onClick={() => setIsTestModalOpen(true)} />
            </div>
            <p className="mt-1 text-xs text-text-body-mid dark:text-text-muted">
              Individual test execution breakdown across test runs
            </p>
          </div>
          <PageSizeControl
            id="tests-history-page-size"
            pageSize={testsPag.pageSize}
            onPageSizeChange={testsPag.changePageSize}
          />
        </div>

        {/* Row 2: Dedicated Date Filter Toolbar & Search Filter */}
        <div className="pt-3 pb-1 border-b border-border-default/50 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <DateFilterControl
            onFilterChange={(range) => {
              setTestFilterRange(range);
              testsPag.setPage(1);
            }}
            availableTimestamps={availableTimestamps}
          />
          <SearchInput
            value={testSearchTerm}
            onChange={(val) => {
              setTestSearchTerm(val);
              testsPag.setPage(1);
            }}
            placeholder="Search tests..."
            className="w-44 sm:w-48 shrink-0"
            inputClassName="w-full rounded-md border border-border-default bg-surface-50 pl-9 pr-7 py-1.5 text-xs text-text-ink placeholder:text-text-muted focus:border-accent-blue focus:outline-none dark:bg-surface-50 dark:text-text-on-primary"
          />
        </div>

        <DataTable
          data={pageTests}
          columns={testColumns}
          getRowKey={(t) => t.key}
          exportFilename="test_case_history.csv"
          fullData={aggregatedTests}
          className="mt-4"
          emptyMessage={
            <div className="py-16 text-center text-text-body-mid dark:text-text-muted">
              <p className="text-base font-semibold">No matching test history found</p>
              <p className="mt-1 text-xs text-text-muted-soft">
                Try adjusting or clearing your date range or search filter criteria.
              </p>
            </div>
          }
        />

        <PaginationFooter
          label="tests"
          total={aggregatedTests.length}
          start={testsPag.start}
          pageLength={pageTests.length}
          currentPage={testsPag.currentPage}
          totalPages={testsPag.totalPages}
          onPageChange={testsPag.setPage}
        />
      </section>

      {/* Interactive Modal Guides */}
      <HistoryGuides
        isRunsModalOpen={isModalOpen}
        onCloseRunsModal={() => setIsModalOpen(false)}
        isFileModalOpen={isFileModalOpen}
        onCloseFileModal={() => setIsFileModalOpen(false)}
        isTestModalOpen={isTestModalOpen}
        onCloseTestModal={() => setIsTestModalOpen(false)}
      />
    </div>
  );
}
