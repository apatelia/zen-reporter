import { PageSizeControl } from '@/components/pagination/PageSizeControl';
import { PaginationFooter } from '@/components/pagination/PaginationFooter';
import { usePagination } from '@/components/pagination/usePagination';
import type { ColumnDef } from '@/components/shared/DataTable';
import { DataTable, ExportCsvButton, exportColumnsToCsv } from '@/components/shared/DataTable';
import type { DateFilterRange } from '@/components/shared/DateFilterControl';
import DateFilterControl from '@/components/shared/DateFilterControl';
import LearnMoreButton from '@/components/shared/LearnMoreButton';
import SearchInput from '@/components/shared/SearchInput';
import { StatusPill } from '@/components/shared/StatusPill';
import type { HistoryRegressionRow } from '@arpanp/zen-core';
import { formatDateLocal, generateExportFilename } from '@arpanp/zen-core';
import { useMemo, useState } from 'react';

export interface RegressionsTableSectionProps {
  regressions: HistoryRegressionRow[];
  availableTimestamps: string[];
  onOpenGuide: () => void;
}

const sectionClass =
  'overflow-hidden rounded-md bg-surface-50 border border-border-default shadow-xs p-4';
const headingClass = 'text-lg font-bold text-text-ink dark:text-text-on-primary';

const regressionStatusTooltips: Record<string, string> = {
  passed: 'Regression resolved: test passed in the latest run.',
  failed: 'Test failed during the last run. Fixing may be required.',
  timedOut: 'Test timed out during the last run. Fixing may be required.',
  interrupted: 'Test run was interrupted. Try to re-run the test to verify status.',
  skipped: 'Test was skipped. Try to re-run the test to verify status.',
};

/**
 * Renders the Regressions table section in Insights with date filtering, search, pagination, and CSV export.
 *
 * @param props - Component props containing regression history rows, timestamps, and modal guide callback.
 * @returns React functional component rendering the regressions table section.
 */
export default function RegressionsTableSection({
  regressions,
  availableTimestamps,
  onOpenGuide,
}: RegressionsTableSectionProps) {
  const [regressionFilterRange, setRegressionFilterRange] = useState<DateFilterRange>({
    fromTimestamp: null,
    toTimestamp: null,
    label: null,
  });
  const [regressionSearchTerm, setRegressionSearchTerm] = useState('');

  const isRegressionFiltered = Boolean(
    regressionFilterRange.fromTimestamp || regressionFilterRange.toTimestamp
  );

  const filteredRegressions = useMemo(() => {
    let list = regressions;

    if (regressionFilterRange.fromTimestamp || regressionFilterRange.toTimestamp) {
      list = list.filter((row) => {
        const regDate = row.regressed_at || row.last_run_at;
        if (!regDate) return true;
        const time = new Date(regDate).getTime();
        if (regressionFilterRange.fromTimestamp && time < regressionFilterRange.fromTimestamp)
          return false;
        if (regressionFilterRange.toTimestamp && time > regressionFilterRange.toTimestamp)
          return false;
        return true;
      });
    }

    if (regressionSearchTerm.trim()) {
      const query = regressionSearchTerm.trim().toLowerCase();
      list = list.filter(
        (row) =>
          row.title.toLowerCase().includes(query) ||
          row.suite.toLowerCase().includes(query) ||
          (row.project && row.project.toLowerCase().includes(query))
      );
    }

    return list;
  }, [regressions, regressionFilterRange, regressionSearchTerm]);

  const regressionsPag = usePagination(filteredRegressions.length, 10);
  const regressionRows = filteredRegressions.slice(
    regressionsPag.start,
    regressionsPag.start + regressionsPag.pageSize
  );

  const regressionColumns: ColumnDef<(typeof regressionRows)[0]>[] = useMemo(
    () => [
      {
        key: 'title',
        header: 'Test',
        className: 'font-bold',
        cell: (row) => row.title,
        csvValue: (row) => row.title,
      },
      {
        key: 'suite',
        header: 'Suite',
        cell: (row) => row.suite || '-',
        csvValue: (row) => row.suite || '',
      },
      {
        key: 'project',
        header: 'Project',
        cell: (row) => row.project,
        csvValue: (row) => row.project,
      },
      {
        key: 'regressed_in',
        header: (
          <span className="inline-flex items-center gap-1.5">
            <span>Regressed In</span>
            {isRegressionFiltered && (
              <span
                className="inline-flex items-center gap-1 rounded bg-success-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-success-600 dark:bg-success-500/20 dark:text-success-400"
                title="Date range filter active on Regressed In column"
              >
                Filtered
              </span>
            )}
          </span>
        ),
        headerLabel: 'Regressed In',
        className: 'text-danger-600 dark:text-danger-500 font-bold',
        cell: (row) => formatDateLocal(row.regressed_at),
        csvValue: (row) => formatDateLocal(row.regressed_at),
      },
      {
        key: 'last_run',
        header: 'Last Run',
        cell: (row) => formatDateLocal(row.last_run_at),
        csvValue: (row) => formatDateLocal(row.last_run_at),
      },
      {
        key: 'last_status',
        header: 'Last Run Status',
        cell: (row) => (
          <StatusPill
            status={row.last_status}
            tooltip={
              regressionStatusTooltips[row.last_status] ??
              'Try to re-run the test to verify status.'
            }
          />
        ),
        csvValue: (row) => row.last_status,
      },
    ],
    [isRegressionFiltered]
  );

  return (
    <section className={sectionClass}>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-3 border-b border-border-default">
        <div>
          <div className="flex items-center gap-2">
            <h2 className={headingClass}>Regressions</h2>
            <LearnMoreButton onClick={onOpenGuide} />
          </div>
          <p className="mt-1 text-xs font-medium text-text-body-mid dark:text-text-muted">
            Tests that previously passed in a prior run but failed during a subsequent run
          </p>
        </div>
        {regressions.length > 0 && filteredRegressions.length > 0 && (
          <PageSizeControl
            id="regressions-page-size"
            pageSize={regressionsPag.pageSize}
            onPageSizeChange={regressionsPag.changePageSize}
            totalItems={filteredRegressions.length}
          />
        )}
      </div>

      {regressions.length > 0 && (
        <div className="pt-3 pb-3 border-b border-border-default/50 flex flex-col gap-3">
          <DateFilterControl
            onFilterChange={(range) => {
              setRegressionFilterRange(range);
              regressionsPag.setPage(1);
            }}
            availableTimestamps={availableTimestamps}
          />
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <SearchInput
              value={regressionSearchTerm}
              onChange={(val) => {
                setRegressionSearchTerm(val);
                regressionsPag.setPage(1);
              }}
              placeholder="Search regressions by title, suite, or project..."
              className="w-full sm:w-80 md:w-96"
            />
            {filteredRegressions.length > 0 && (
              <ExportCsvButton
                onClick={() =>
                  exportColumnsToCsv(
                    () =>
                      generateExportFilename('test_regressions', {
                        dateRange: regressionFilterRange,
                        searchTerm: regressionSearchTerm,
                      }),
                    filteredRegressions,
                    regressionColumns
                  )
                }
                count={filteredRegressions.length}
              />
            )}
          </div>
        </div>
      )}

      {filteredRegressions.length === 0 ? (
        <p className="mt-3 text-xs font-medium text-text-body-mid dark:text-text-muted">
          {regressionFilterRange.fromTimestamp || regressionFilterRange.toTimestamp
            ? 'No regressions detected in the selected date range.'
            : 'No regressions detected.'}
        </p>
      ) : (
        <>
          <DataTable
            data={regressionRows}
            fullData={filteredRegressions}
            columns={regressionColumns}
            getRowKey={(row) => `${row.project}/${row.file}/${row.title}`}
            compact
            exportFilename={() =>
              generateExportFilename('test_regressions', {
                dateRange: regressionFilterRange,
                searchTerm: regressionSearchTerm,
              })
            }
            hideExportButton
            className="mt-3"
          />
          <PaginationFooter
            label="regressions"
            total={filteredRegressions.length}
            start={regressionsPag.start}
            pageLength={regressionRows.length}
            currentPage={regressionsPag.currentPage}
            totalPages={regressionsPag.totalPages}
            onPageChange={regressionsPag.setPage}
          />
        </>
      )}
    </section>
  );
}
