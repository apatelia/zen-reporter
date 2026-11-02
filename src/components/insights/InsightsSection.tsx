import { useState, useMemo } from 'react';
import InsightsGuides, { type InsightModalType } from './InsightsGuides';
import type { TestSuite } from '@arpanp/zen-core';
import type { HistoryData } from '@arpanp/zen-core';
import { computeProjectStats, collectAllCases } from '@/lib/statsUtils';
import ProjectFlakyRateChart from './ProjectFlakyRateChart';
import ProjectDurationChart from '@/components/insights/ProjectDurationChart';
import FlakyTestsTableSection from './FlakyTestsTableSection';
import RegressionsTableSection from './RegressionsTableSection';
import SlowestTestsTableSection from './SlowestTestsTableSection';
import HistoryDisabledBanner from '@/components/shared/HistoryDisabledBanner';

export interface InsightsSectionProps {
  history: HistoryData | null;
  suites: TestSuite[];
  isHistoryDisabled?: boolean;
}

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

      {/* 1. Duration & P95 Latency Benchmark Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 items-stretch">
        <ProjectDurationChart
          projectStats={computeProjectStats(collectAllCases(suites))}
          title="Execution Duration & P95 Latency Benchmark"
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
        <div className="flex items-center justify-center py-16 text-center rounded-md border border-border-default bg-surface-50 p-6">
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
              after your test runs to populate flaky test history, regressions, and slowest tests.
            </p>
          </div>
        </div>
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
