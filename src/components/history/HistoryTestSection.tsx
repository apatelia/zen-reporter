import { useMemo, useState } from 'react';
import { PageSizeControl } from '@/components/pagination/PageSizeControl';
import { PaginationFooter } from '@/components/pagination/PaginationFooter';
import { usePagination } from '@/components/pagination/usePagination';
import { ColumnDef, DataTable, PassRateBadge } from '@/components/shared/DataTable';
import DateFilterControl, { type DateFilterRange } from '@/components/shared/DateFilterControl';
import LearnMoreButton from '@/components/shared/LearnMoreButton';
import SearchInput from '@/components/shared/SearchInput';
import type { HistoryData, HistoryTestRow } from '@/lib/types/history';
import { formatDuration, truncateFileName } from '@/lib/formatters';

export interface HistoryTestSectionProps {
  history: HistoryData;
  availableTimestamps: string[];
  onOpenGuide: () => void;
}

const sectionClass = 'rounded-md border border-border-default bg-surface-50 p-6 shadow-xs';
const headingClass = 'text-xl font-bold text-text-ink dark:text-text-on-primary';

export function HistoryTestSection({
  history,
  availableTimestamps,
  onOpenGuide,
}: HistoryTestSectionProps) {
  const [testFilterRange, setTestFilterRange] = useState<DateFilterRange>({
    fromTimestamp: null,
    toTimestamp: null,
    label: null,
  });
  const [testSearchTerm, setTestSearchTerm] = useState('');

  const aggregatedTests = useMemo(() => {
    let rawTests: HistoryTestRow[] = history.tests ?? [];
    if (rawTests.length === 0) {
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

  const pageTests = aggregatedTests.slice(testsPag.start, testsPag.start + testsPag.pageSize);

  return (
    <section className={sectionClass}>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-3 border-b border-border-default">
        <div>
          <div className="flex items-center gap-3">
            <h2 className={headingClass}>Test History</h2>
            <LearnMoreButton onClick={onOpenGuide} />
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
  );
}
