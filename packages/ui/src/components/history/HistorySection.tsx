import { useMemo, useState } from 'react';
import HistoryDisabledBanner from '@/components/shared/HistoryDisabledBanner';
import OfflineHistoryNotice from '@/components/shared/OfflineHistoryNotice';
import type { HistoryData } from '@arpanp/zen-core';
import HistoryGuides from './HistoryGuides';
import { HistoryFileSection } from './HistoryFileSection';
import { HistoryRunsTableSection } from './HistoryRunsTableSection';
import { HistoryTestSection } from './HistoryTestSection';

export interface HistorySectionProps {
  history: HistoryData | null;
  isHistoryDisabled?: boolean;
  onSelectRun?: (runId: string) => void;
  selectedRunId?: string | null;
}

export default function HistorySection({
  history,
  isHistoryDisabled,
  onSelectRun,
  selectedRunId,
}: HistorySectionProps) {
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
        <OfflineHistoryNotice />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {isHistoryDisabled && <HistoryDisabledBanner />}
      <h1 className="sr-only">Execution Run History</h1>

      {/* Test Runs Audit Log Section */}
      <HistoryRunsTableSection
        runs={history.runs}
        availableTimestamps={availableTimestamps}
        onOpenGuide={() => setIsModalOpen(true)}
        onSelectRun={onSelectRun}
        selectedRunId={selectedRunId}
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
