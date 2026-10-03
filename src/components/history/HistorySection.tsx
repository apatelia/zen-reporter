import { useMemo, useState } from 'react';
import HistoryDisabledBanner from '@/components/shared/HistoryDisabledBanner';
import type { HistoryData } from '@/lib/types/history';
import HistoryGuides from './HistoryGuides';
import { HistoryFileSection } from './HistoryFileSection';
import { HistoryRunsTableSection } from './HistoryRunsTableSection';
import { HistoryTestSection } from './HistoryTestSection';

export interface HistorySectionProps {
  history: HistoryData | null;
  isHistoryDisabled?: boolean;
}

export default function HistorySection({ history, isHistoryDisabled }: HistorySectionProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isFileModalOpen, setIsFileModalOpen] = useState(false);
  const [isTestModalOpen, setIsTestModalOpen] = useState(false);

  const availableTimestamps = useMemo(
    () => history?.runs.map((r) => r.started_at) ?? [],
    [history]
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

      {/* Test Runs Audit Log Section */}
      <HistoryRunsTableSection
        runs={history.runs}
        availableTimestamps={availableTimestamps}
        onOpenGuide={() => setIsModalOpen(true)}
      />

      {/* Spec Files History Breakdown Section */}
      <HistoryFileSection
        rawFiles={history.files ?? []}
        availableTimestamps={availableTimestamps}
        onOpenGuide={() => setIsFileModalOpen(true)}
      />

      {/* Individual Test History Breakdown Section */}
      <HistoryTestSection
        history={history}
        availableTimestamps={availableTimestamps}
        onOpenGuide={() => setIsTestModalOpen(true)}
      />

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
