import { useState, useMemo } from 'react';
import { truncateFileName, calculatePassRate } from '@arpanp/zen-core';
import { collectAllCases, computeFileStats, type FileStats } from '@arpanp/zen-core';
import type { TestSuite } from '@arpanp/zen-core';
import { usePagination } from '@/components/pagination/usePagination';
import { PageSizeControl } from '@/components/pagination/PageSizeControl';
import { PaginationFooter } from '@/components/pagination/PaginationFooter';
import {
  DataTable,
  ExportCsvButton,
  exportColumnsToCsv,
  type ColumnDef,
} from '@/components/shared/DataTable';
import { PassRateBadge } from '@/components/shared/PassRateBadge';
import { StatusCountBadge } from '@/components/shared/StatusCountBadge';
import SearchInput from '@/components/shared/SearchInput';
import { generateExportFilename } from '@arpanp/zen-core';

export interface FileSummaryProps {
  suites: TestSuite[];
  title?: string;
  testRunName?: string;
}

export default function FileSummary({ suites, title, testRunName }: FileSummaryProps) {
  const [fileSearchTerm, setFileSearchTerm] = useState('');

  const allCases = useMemo(() => collectAllCases(suites), [suites]);
  const fileStats = useMemo(() => computeFileStats(allCases), [allCases]);

  const filteredFiles = useMemo(() => {
    if (!fileSearchTerm.trim()) return fileStats;
    const term = fileSearchTerm.trim().toLowerCase();
    return fileStats.filter((f) => f.fileName.toLowerCase().includes(term));
  }, [fileStats, fileSearchTerm]);

  const pagination = usePagination(filteredFiles.length, 25);

  if (fileStats.length === 0) return null;

  const paginatedFiles = filteredFiles.slice(
    pagination.start,
    pagination.start + pagination.pageSize
  );

  const fileColumns: ColumnDef<FileStats>[] = [
    {
      key: 'fileName',
      header: 'File',
      cell: (f) => (
        <div
          className="max-w-xs sm:max-w-md overflow-hidden text-ellipsis whitespace-nowrap font-medium text-text-ink dark:text-text-on-primary"
          title={f.fileName}
        >
          {truncateFileName(f.fileName)}
        </div>
      ),
      csvValue: (f) => f.fileName,
    },
    {
      key: 'total',
      header: 'Total',
      align: 'center',
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
      key: 'flaky',
      header: 'Flaky',
      align: 'center',
      cell: (f) => <StatusCountBadge count={f.flakyCount} type="flaky" />,
      csvValue: (f) => f.flakyCount,
    },
    {
      key: 'failed',
      header: 'Failed',
      align: 'center',
      cell: (f) => <StatusCountBadge count={f.failed} type="failed" />,
      csvValue: (f) => f.failed,
    },
    {
      key: 'timedOut',
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
      key: 'passRate',
      header: 'Pass Rate',
      align: 'center',
      cell: (f) => {
        const passRate = calculatePassRate(f.passed + f.flakyCount, f.total);
        return <PassRateBadge passRate={passRate} />;
      },
      csvValue: (f) => calculatePassRate(f.passed + f.flakyCount, f.total) ?? 0,
    },
  ];

  return (
    <div className="overflow-hidden rounded-md bg-surface-50 border border-border-default shadow-xs p-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-3 border-b border-border-default">
        <div>
          {title && (
            <h3 className="text-lg font-bold text-text-ink dark:text-text-on-primary">{title}</h3>
          )}
          <p className="mt-1 text-xs text-text-body-mid dark:text-text-muted">
            Test results and execution breakdown per test file
          </p>
        </div>
        {fileStats.length > 0 && filteredFiles.length > 0 && (
          <PageSizeControl
            id="files-page-size"
            pageSize={pagination.pageSize}
            onPageSizeChange={pagination.changePageSize}
            totalItems={filteredFiles.length}
          />
        )}
      </div>

      {fileStats.length > 0 && (
        <div className="pt-3 pb-3 border-b border-border-default flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <SearchInput
            value={fileSearchTerm}
            onChange={(val) => {
              setFileSearchTerm(val);
              pagination.setPage(1);
            }}
            placeholder="Search spec files by file name or path..."
            className="w-full sm:w-80 md:w-96"
          />
          {filteredFiles.length > 0 && (
            <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap">
              {testRunName && (
                <div
                  className="inline-flex items-center gap-1.5 text-xs text-text-body-mid dark:text-text-muted px-1.5 py-0.5 select-none"
                  title={`Active Test Run: ${testRunName}`}
                >
                  <span className="text-[11px] font-medium text-text-muted">Run:</span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-surface-200/80 dark:bg-surface-300/60 border border-border-default/60 px-2 py-0.5 text-[11px] font-semibold text-text-ink dark:text-text-on-primary max-w-56 truncate">
                    <svg
                      className="h-2.5 w-2.5 text-text-muted shrink-0"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                      />
                    </svg>
                    <span className="truncate">{testRunName}</span>
                  </span>
                </div>
              )}
              <ExportCsvButton
                onClick={() =>
                  exportColumnsToCsv(
                    () =>
                      generateExportFilename('file_summary_metrics', {
                        searchTerm: fileSearchTerm,
                        additionalTags: testRunName ? [testRunName] : undefined,
                      }),
                    filteredFiles,
                    fileColumns
                  )
                }
                count={filteredFiles.length}
              />
            </div>
          )}
        </div>
      )}

      <DataTable
        data={paginatedFiles}
        fullData={filteredFiles}
        columns={fileColumns}
        getRowKey={(f) => f.fileName}
        exportFilename={() =>
          generateExportFilename('file_summary_metrics', {
            searchTerm: fileSearchTerm,
            additionalTags: testRunName ? [testRunName] : undefined,
          })
        }
        hideExportButton
        className="mt-3"
        emptyMessage={
          <div className="py-12 text-center text-text-body-mid dark:text-text-muted">
            <p className="text-base font-semibold">No matching files found</p>
            <p className="mt-1 text-xs text-text-muted-soft">
              Try adjusting your search filter criteria.
            </p>
          </div>
        }
      />

      <PaginationFooter
        label="files"
        total={filteredFiles.length}
        start={pagination.start}
        pageLength={paginatedFiles.length}
        currentPage={pagination.currentPage}
        totalPages={pagination.totalPages}
        onPageChange={pagination.setPage}
        className="mt-4 flex items-center justify-between text-xs font-medium text-text-ink dark:text-text-on-primary"
      />
    </div>
  );
}
