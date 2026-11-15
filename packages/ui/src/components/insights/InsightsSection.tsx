import { useState, useMemo } from 'react';
import InsightsGuides, { type InsightModalType } from './InsightsGuides';
import type { HistoryData } from '@arpanp/zen-core';
import FlakyTestsTableSection from './FlakyTestsTableSection';
import RegressionsTableSection from './RegressionsTableSection';
import SlowestTestsTableSection from './SlowestTestsTableSection';
import HistoryDisabledBanner from '@/components/shared/HistoryDisabledBanner';
import OfflineHistoryNotice from '@/components/shared/OfflineHistoryNotice';

export interface InsightsSectionProps {
  history: HistoryData | null;
  isHistoryDisabled?: boolean;
}

/**
 * Renders the Insights tab: historical flaky, regressions, and slowest test tables,
 * with per-section Learn More guides.
 * @param history - Aggregated history data (flaky, regressions, slowest, runs) or null in standalone reports.
 * @param isHistoryDisabled - True when history analytics are unavailable.
 * @returns The Insights tab section.
 */
export default function InsightsSection({ history, isHistoryDisabled }: InsightsSectionProps) {
  const [activeModal, setActiveModal] = useState<InsightModalType>(null);

  const availableTimestamps = useMemo(
    () => history?.runs.map((r) => r.started_at) ?? [],
    [history]
  );

  return (
    <div className="space-y-6">
      {isHistoryDisabled && <HistoryDisabledBanner />}
      <h1 className="sr-only">Analytical Insights</h1>

      {!history ? (
        <OfflineHistoryNotice
          title="Flaky, regression, and slowest test analytics require server mode"
          description="You are currently viewing a standalone offline report. Deep cross-run insights, historical regressions, and flakiness calculations are computed from the project database."
        />
      ) : (
        <>
          {/* 1. Flaky Tests Section */}
          <FlakyTestsTableSection
            flaky={history.flaky}
            runTimestamps={history.runs}
            availableTimestamps={availableTimestamps}
            onOpenGuide={() => setActiveModal('flaky-tests')}
          />

          {/* 2. Regressions Section */}
          <RegressionsTableSection
            regressions={history.regressions}
            availableTimestamps={availableTimestamps}
            onOpenGuide={() => setActiveModal('regressions')}
          />

          {/* 3. Slowest Tests Section */}
          <SlowestTestsTableSection
            slowest={history.slowest}
            onOpenGuide={() => setActiveModal('slowest-tests')}
          />
        </>
      )}

      {/* Dynamic Modal Guide Component */}
      <InsightsGuides activeModal={activeModal} onClose={() => setActiveModal(null)} />
    </div>
  );
}
