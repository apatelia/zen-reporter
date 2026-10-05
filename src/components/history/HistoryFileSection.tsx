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
import type { HistoryFileRow } from '@/lib/types/history';
import { truncateFileName, calculatePassRate } from '@/lib/formatters';
import { generateExportFilename } from '@/lib/exportFilename';

export interface HistoryFileSectionProps {
  rawFiles: HistoryFileRow[];
  availableTimestamps: string[];
  onOpenGuide: () => void;
}

const sectionClass =
  'overflow-hidden rounded-md bg-canvas border border-border-default shadow-sm p-4';
const headingClass = 'text-lg font-bold text-text-ink dark:text-text-on-primary';

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

  const isFiltered = Boolean(fileFilterRange.fromTimestamp || fileFilterRange.toTimestamp);

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
        const passRate = calculatePassRate(item.passed, total);
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
        header: (
          <span className="inline-flex items-center gap-1.5">
            <span>Runs</span>
            {isFiltered && (
              <span
                className="inline-flex items-center gap-1 rounded bg-success-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-success-600 dark:bg-success-500/20 dark:text-success-400"
                title="Date range filter active on sampled runs"
              >
                Filtered
              </span>
            )}
          </span>
        ),
        headerLabel: 'Runs',
        align: 'center',
        className: 'text-text-body-mid dark:text-text-muted',
        cell: (f) => f.runsCount,
        csvValue: (f) => f.runsCount,
      },
      {
        key: 'total',
        header: 'Total Tests',
        align: 'center',
        className: 'font-medium',
        cell: (f) => f.total,
        csvValue: (f) => f.total,
      },
      {
        key: 'passed',
        header: 'Passed',
        align: 'center',
        cell: (f) => <StatusCountBadge count={f.passed} type="passed" />,
        csvValue: (f) => f.passed,
      },
      {
        key: 'failed',
        header: 'Failed',
        align: 'center',
        cell: (f) => <StatusCountBadge count={f.failed} type="failed" />,
        csvValue: (f) => f.failed,
      },
      {
        key: 'timed_out',
        header: 'Timed Out',
        align: 'center',
        cell: (f) => <StatusCountBadge count={f.timedOut} type="timedOut" />,
        csvValue: (f) => f.timedOut,
      },
      {
        key: 'interrupted',
        header: 'Interrupted',
        align: 'center',
        cell: (f) => <StatusCountBadge count={f.interrupted} type="interrupted" />,
        csvValue: (f) => f.interrupted,
      },
      {
        key: 'skipped',
        header: 'Skipped',
        align: 'center',
        cell: (f) => <StatusCountBadge count={f.skipped} type="skipped" />,
        csvValue: (f) => f.skipped,
      },
      {
        key: 'pass_rate',
        header: 'Pass Rate',
        align: 'center',
        cell: (f) => <PassRateBadge passRate={f.passRate} />,
        csvValue: (f) => (f.passRate != null ? `${f.passRate}%` : '-'),
      },
    ],
    [isFiltered]
  );

  const pageFiles = aggregatedFiles.slice(filesPag.start, filesPag.start + filesPag.pageSize);

  return (
    <section className={sectionClass}>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-3 border-b border-border-default">
        <div>
          <div className="flex items-center gap-3">
            <h2 className={headingClass}>File Execution History</h2>
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

      <div className="pt-3 pb-3 border-b border-border-default/50 flex flex-col gap-3">
        <DateFilterControl
          onFilterChange={(range) => {
            setFileFilterRange(range);
            filesPag.setPage(1);
          }}
          availableTimestamps={availableTimestamps}
        />
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <SearchInput
            value={fileNameSearchTerm}
            onChange={(val) => {
              setFileNameSearchTerm(val);
              filesPag.setPage(1);
            }}
            placeholder="Search file history by spec file name or path..."
            className="w-full sm:w-80 md:w-96"
          />
          {aggregatedFiles.length > 0 && (
            <ExportCsvButton
              onClick={() =>
                exportColumnsToCsv(
                  () =>
                    generateExportFilename('spec_file_history', {
                      dateRange: fileFilterRange,
                      searchTerm: fileNameSearchTerm,
                    }),
                  aggregatedFiles,
                  fileColumns
                )
              }
              count={aggregatedFiles.length}
            />
          )}
        </div>
      </div>

      <DataTable
        data={pageFiles}
        columns={fileColumns}
        getRowKey={(f) => f.file}
        exportFilename={() =>
          generateExportFilename('spec_file_history', {
            dateRange: fileFilterRange,
            searchTerm: fileNameSearchTerm,
          })
        }
        fullData={aggregatedFiles}
        hideExportButton
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
