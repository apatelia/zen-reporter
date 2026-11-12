import { useState, useMemo } from 'react';
import InsightsGuides, { type InsightModalType } from './InsightsGuides';
import type { TestSuite } from '@arpanp/zen-core';
import type { HistoryData } from '@arpanp/zen-core';
import { computeProjectStats, collectAllCases } from '@arpanp/zen-core';
import ProjectFlakyRateChart from './ProjectFlakyRateChart';
import ProjectLatencySpreadChart from '@/components/insights/ProjectLatencySpreadChart';
import FlakyTestsTableSection from './FlakyTestsTableSection';
import RegressionsTableSection from './RegressionsTableSection';
import SlowestTestsTableSection from './SlowestTestsTableSection';
import HistoryDisabledBanner from '@/components/shared/HistoryDisabledBanner';
import OfflineHistoryNotice from '@/components/shared/OfflineHistoryNotice';

export interface InsightsSectionProps {
  history: HistoryData | null;
  suites: TestSuite[];
  isHistoryDisabled?: boolean;
}

/**
 * Renders the Insights tab: duration/flaky benchmark charts and the flaky,
 * regressions, and slowest test tables, with per-section Learn More guides.
 * @param history - Aggregated history data (flaky, regressions, slowest, runs) or null in standalone reports.
 * @param suites - Test suites for the current run.
 * @param isHistoryDisabled - True when history analytics are unavailable.
 * @returns The Insights tab section.
 */
export default function InsightsSection({
  history,
  suites,
  isHistoryDisabled,
}: InsightsSectionProps) {
  const [activeModal, setActiveModal] = useState<InsightModalType>(null);

  const availableTimestamps = useMemo(
    () => history?.runs.map((r) => r.started_at) ?? [],
    [history]
  );

  return (
    <div className="space-y-6">
      {isHistoryDisabled && <HistoryDisabledBanner />}
      <h1 className="sr-only">Analytical Insights</h1>

      {/* 1. Duration Spread & P95 Latency Benchmark Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 items-stretch">
        <ProjectLatencySpreadChart
          projectStats={computeProjectStats(collectAllCases(suites))}
          title="Duration Spread & P95 Latency by Project"
          className="rounded-md border border-border-default bg-surface-50 p-5 shadow-xs flex flex-col justify-between"
          onOpenGuide={() => setActiveModal('duration-benchmark')}
        />
        <ProjectFlakyRateChart
          suites={suites}
          title="Flaky Test Count & Retry Rate by Project"
          onOpenGuide={() => setActiveModal('project-flaky-rate')}
        />
      </div>

      {!history ? (
        <OfflineHistoryNotice
          title="Flaky, regression, and slowest test analytics require server mode"
          description="You are currently viewing a standalone offline report. Deep cross-run insights, historical regressions, and flakiness calculations are computed from the project database."
        />
      ) : (
        <>
          {/* 2. Flaky Tests Section */}
          <FlakyTestsTableSection
            flaky={history.flaky}
            runTimestamps={history.runs}
            availableTimestamps={availableTimestamps}
            onOpenGuide={() => setActiveModal('flaky-tests')}
          />

          {/* 3. Regressions Section */}
          <RegressionsTableSection
            regressions={history.regressions}
            availableTimestamps={availableTimestamps}
            onOpenGuide={() => setActiveModal('regressions')}
          />

          {/* 4. Slowest Tests Section */}
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
