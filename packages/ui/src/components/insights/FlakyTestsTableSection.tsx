import { PaginationFooter } from '@/components/pagination/PaginationFooter';
import { usePagination } from '@/components/pagination/usePagination';
import type { ColumnDef } from '@/components/shared/DataTable';
import { DataTable, ExportCsvButton, exportColumnsToCsv } from '@/components/shared/DataTable';
import type { DateFilterRange } from '@/components/shared/DateFilterControl';
import DateFilterControl from '@/components/shared/DateFilterControl';
import LearnMoreButton from '@/components/shared/LearnMoreButton';
import SearchInput from '@/components/shared/SearchInput';
import type { HistoryFlakyRow } from '@arpanp/zen-core';
import { formatDateLocal, generateExportFilename } from '@arpanp/zen-core';
import { useMemo, useState } from 'react';

export interface FlakyTestsTableSectionProps {
  flaky: HistoryFlakyRow[];
  runTimestamps: { started_at: string }[];
  availableTimestamps: string[];
  onOpenGuide: () => void;
}

const sectionClass =
  'overflow-hidden rounded-md bg-surface-50 border border-border-default shadow-xs p-4';
const headingClass = 'text-lg font-bold text-text-ink dark:text-text-on-primary';

/**
 * Renders the Flaky Tests table section in Insights with date filtering, search, pagination, and CSV export.
 *
 * @param props - Component props containing flaky history rows, timestamps, and modal guide callback.
 * @returns React functional component rendering the flaky tests table section.
 */
export default function FlakyTestsTableSection({
  flaky,
  runTimestamps,
  availableTimestamps,
  onOpenGuide,
}: FlakyTestsTableSectionProps) {
  const [flakyFilterRange, setFlakyFilterRange] = useState<DateFilterRange>({
    fromTimestamp: null,
    toTimestamp: null,
    label: null,
  });
  const [flakySearchTerm, setFlakySearchTerm] = useState('');

  const isFlakyFiltered = Boolean(flakyFilterRange.fromTimestamp || flakyFilterRange.toTimestamp);

  const filteredFlakyRuns = useMemo(() => {
    if (!flakyFilterRange.fromTimestamp && !flakyFilterRange.toTimestamp) return runTimestamps;

    return runTimestamps.filter((run) => {
      const runTime = new Date(run.started_at).getTime();
      if (flakyFilterRange.fromTimestamp && runTime < flakyFilterRange.fromTimestamp) return false;
      if (flakyFilterRange.toTimestamp && runTime > flakyFilterRange.toTimestamp) return false;
      return true;
    });
  }, [runTimestamps, flakyFilterRange]);

  const filteredFlaky = useMemo(() => {
    let list = flaky;

    if (flakyFilterRange.fromTimestamp || flakyFilterRange.toTimestamp) {
      if (filteredFlakyRuns.length === 0) {
        list = [];
      } else {
        list = list.filter((row) => {
          const dateStr = row.last_flaky_at || row.last_seen_at;
          if (!dateStr) return true;
          const time = new Date(dateStr).getTime();
          if (flakyFilterRange.fromTimestamp && time < flakyFilterRange.fromTimestamp) return false;
          if (flakyFilterRange.toTimestamp && time > flakyFilterRange.toTimestamp) return false;
          return true;
        });
      }
    }

    if (flakySearchTerm.trim()) {
      const query = flakySearchTerm.trim().toLowerCase();
      list = list.filter(
        (row) =>
          row.title.toLowerCase().includes(query) ||
          row.suite.toLowerCase().includes(query) ||
          (row.project && row.project.toLowerCase().includes(query))
      );
    }

    return list;
  }, [flaky, flakyFilterRange, filteredFlakyRuns, flakySearchTerm]);

  const flakyPag = usePagination(filteredFlaky.length, 10);
  const flakyRows = filteredFlaky.slice(flakyPag.start, flakyPag.start + flakyPag.pageSize);

  const flakyColumns: ColumnDef<(typeof flakyRows)[0]>[] = useMemo(
    () => [
      {
        key: 'suite',
        header: 'Suite',
        cell: (row) => row.suite || '-',
        csvValue: (row) => row.suite || '',
      },
      {
        key: 'title',
        header: 'Test',
        className: 'font-bold',
        cell: (row) => row.title,
        csvValue: (row) => row.title,
      },
      {
        key: 'project',
        header: 'Project',
        cell: (row) => row.project,
        csvValue: (row) => row.project,
      },
      {
        key: 'last_seen',
        header: (
          <span className="inline-flex items-center gap-1.5">
            <span>Last Flaky Date</span>
            {isFlakyFiltered && (
              <span
                className="inline-flex items-center gap-1 rounded bg-accent-blue/10 px-1.5 py-0.5 text-[10px] font-semibold text-accent-blue dark:bg-accent-blue/20 dark:text-accent-blue"
                title="Date range filter active on this column"
              >
                Filtered
              </span>
            )}
          </span>
        ),
        headerLabel: 'Last Flaky Date',
        cell: (row) => {
          const dateStr = row.last_flaky_at || row.last_seen_at;
          return dateStr ? formatDateLocal(dateStr) : '-';
        },
        csvValue: (row) => {
          const dateStr = row.last_flaky_at || row.last_seen_at;
          return dateStr ? formatDateLocal(dateStr) : '';
        },
      },
      {
        key: 'failed_runs',
        header: 'Failed Runs',
        align: 'right',
        cell: (row) => (
          <span
            className={row.failed_runs > 0 ? 'text-danger-600 dark:text-danger-500 font-bold' : ''}
          >
            {row.failed_runs}
          </span>
        ),
        csvValue: (row) => row.failed_runs,
      },
      {
        key: 'passed_runs',
        header: 'Passed Runs',
        align: 'right',
        cell: (row) => (
          <span
            className={
              row.passed_runs > 0 ? 'text-success-600 dark:text-success-500 font-bold' : ''
            }
          >
            {row.passed_runs}
          </span>
        ),
        csvValue: (row) => row.passed_runs,
      },
      {
        key: 'recovered_by_retry',
        header: 'Recovered by Retry',
        align: 'right',
        cell: (row) => (
          <span
            className={
              row.recovered_by_retry > 0 ? 'text-warning-600 dark:text-warning-500 font-bold' : ''
            }
          >
            {row.recovered_by_retry}
          </span>
        ),
        csvValue: (row) => row.recovered_by_retry,
      },
      {
        key: 'total_runs',
        header: 'Total Runs',
        align: 'right',
        className: 'font-bold',
        cell: (row) => row.total_runs,
        csvValue: (row) => row.total_runs,
      },
    ],
    [isFlakyFiltered]
  );

  return (
    <section className={sectionClass}>
      <div className="pb-3 border-b border-border-default">
        <div className="flex items-center gap-2">
          <h2 className={headingClass}>Flaky tests</h2>
          <LearnMoreButton onClick={onOpenGuide} />
        </div>
        <p className="mt-1 text-xs font-medium text-text-body-mid dark:text-text-muted">
          Tests that failed in some runs and passed in others (minimum 1 failure and 1 success)
        </p>
      </div>

      {flaky.length > 0 && (
        <div className="pt-3 pb-3 border-b border-border-default/50 flex flex-col gap-3">
          <DateFilterControl
            onFilterChange={(range) => {
              setFlakyFilterRange(range);
              flakyPag.setPage(1);
            }}
            availableTimestamps={availableTimestamps}
          />
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <SearchInput
              value={flakySearchTerm}
              onChange={(val) => {
                setFlakySearchTerm(val);
                flakyPag.setPage(1);
              }}
              placeholder="Search flaky tests by title, suite, or project..."
              className="w-full sm:w-80 md:w-96"
            />
            {filteredFlaky.length > 0 && (
              <ExportCsvButton
                onClick={() =>
                  exportColumnsToCsv(
                    () =>
                      generateExportFilename('flaky_tests', {
                        dateRange: flakyFilterRange,
                        searchTerm: flakySearchTerm,
                      }),
                    filteredFlaky,
                    flakyColumns
                  )
                }
                count={filteredFlaky.length}
              />
            )}
          </div>
        </div>
      )}

      {filteredFlaky.length === 0 ? (
        <p className="mt-3 text-xs font-medium text-text-body-mid dark:text-text-muted">
          {flakyFilterRange.fromTimestamp || flakyFilterRange.toTimestamp
            ? 'No flaky tests detected in the selected date range.'
            : 'No flaky tests detected.'}
        </p>
      ) : (
        <>
          <DataTable
            data={flakyRows}
            fullData={filteredFlaky}
            columns={flakyColumns}
            getRowKey={(row, i) => `${row.project}/${row.file}/${row.title}/${i}`}
            compact
            exportFilename={() =>
              generateExportFilename('flaky_tests', {
                dateRange: flakyFilterRange,
                searchTerm: flakySearchTerm,
              })
            }
            hideExportButton
            className="mt-3"
          />
          <PaginationFooter
            label="flaky tests"
            total={filteredFlaky.length}
            start={flakyPag.start}
            pageLength={flakyRows.length}
            currentPage={flakyPag.currentPage}
            totalPages={flakyPag.totalPages}
            onPageChange={flakyPag.setPage}
            pageSize={flakyPag.pageSize}
            onPageSizeChange={flakyPag.changePageSize}
            pageSizeId="flaky-page-size"
          />
        </>
      )}
    </section>
  );
}
