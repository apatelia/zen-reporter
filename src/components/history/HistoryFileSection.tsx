import { useMemo, useState } from 'react';
import { PageSizeControl } from '@/components/pagination/PageSizeControl';
import { PaginationFooter } from '@/components/pagination/PaginationFooter';
import { usePagination } from '@/components/pagination/usePagination';
import { ColumnDef, DataTable, PassRateBadge } from '@/components/shared/DataTable';
import DateFilterControl, { type DateFilterRange } from '@/components/shared/DateFilterControl';
import LearnMoreButton from '@/components/shared/LearnMoreButton';
import SearchInput from '@/components/shared/SearchInput';
import type { HistoryFileRow } from '@/lib/types/history';
import { truncateFileName } from '@/lib/formatters';

export interface HistoryFileSectionProps {
  rawFiles: HistoryFileRow[];
  availableTimestamps: string[];
  onOpenGuide: () => void;
}

const sectionClass = 'rounded-md border border-border-default bg-surface-50 p-6 shadow-xs';
const headingClass = 'text-xl font-bold text-text-ink dark:text-text-on-primary';

export function HistoryFileSection({
  rawFiles,
  availableTimestamps,
  onOpenGuide,
}: HistoryFileSectionProps) {
  const [fileFilterRange, setFileFilterRange] = useState<DateFilterRange>({
    fromTimestamp: null,
    toTimestamp: null,
    label: null,
  });
  const [fileNameSearchTerm, setFileNameSearchTerm] = useState('');

  const aggregatedFiles = useMemo(() => {
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
  }, [rawFiles, fileFilterRange, fileNameSearchTerm]);

  const filesPag = usePagination(aggregatedFiles.length, 10);

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

  const pageFiles = aggregatedFiles.slice(filesPag.start, filesPag.start + filesPag.pageSize);

  return (
    <section className={sectionClass}>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-3 border-b border-border-default">
        <div>
          <div className="flex items-center gap-3">
            <h2 className={headingClass}>File History</h2>
            <LearnMoreButton onClick={onOpenGuide} />
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
  );
}
