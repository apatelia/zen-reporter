import { useState } from 'react';
import type { TestSuite } from '@arpanp/zen-core';
import type { HistoryData } from '@arpanp/zen-core';
import PassRateTrend from '@/components/trends/PassRateTrend';
import DurationTrend from '@/components/trends/DurationTrend';
import StepCategoryTrend from '@/components/trends/StepCategoryTrend';
import TrendsGuides from '@/components/trends/TrendsGuides';
import HistoryDisabledBanner from '@/components/shared/HistoryDisabledBanner';
import OfflineHistoryNotice from '@/components/shared/OfflineHistoryNotice';

export interface TrendsSectionProps {
  history: HistoryData | null;
  suites: TestSuite[];
  projectColorMap: Record<string, string>;
  isHistoryDisabled?: boolean;
}

export default function TrendsSection({
  history,
  suites,
  projectColorMap,
  isHistoryDisabled,
}: TrendsSectionProps) {
  const [passRateModalOpen, setPassRateModalOpen] = useState(false);
  const [durationModalOpen, setDurationModalOpen] = useState(false);
  const [stepCategoryModalOpen, setStepCategoryModalOpen] = useState(false);

  const guidesElement = (
    <TrendsGuides
      passRateModalOpen={passRateModalOpen}
      onClosePassRateModal={() => setPassRateModalOpen(false)}
      durationModalOpen={durationModalOpen}
      onCloseDurationModal={() => setDurationModalOpen(false)}
      stepCategoryModalOpen={stepCategoryModalOpen}
      onCloseStepCategoryModal={() => setStepCategoryModalOpen(false)}
    />
  );

  if (!history) {
    return (
      <div className="space-y-6">
        {isHistoryDisabled && <HistoryDisabledBanner />}
        <h1 className="sr-only">Historical Trends</h1>
        {/* Step Category Composition for current run can still display even without history */}
        <StepCategoryTrend
          suites={suites}
          history={null}
          onOpenGuide={() => setStepCategoryModalOpen(true)}
        />
        <OfflineHistoryNotice
          title="Historical trends require server mode"
          description="You are currently viewing a standalone offline report. Pass rate and duration trends across historical executions are stored in the project database."
        />

        {/* Interactive Modal Guides */}
        {guidesElement}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {isHistoryDisabled && <HistoryDisabledBanner />}
      <h1 className="sr-only">Historical Trends</h1>

      {/* 1. Pass Rate Trend Section */}
      <PassRateTrend history={history} onOpenGuide={() => setPassRateModalOpen(true)} />

      {/* 2. Duration Trend Section */}
      <DurationTrend
        history={history}
        projectColorMap={projectColorMap}
        onOpenGuide={() => setDurationModalOpen(true)}
      />

      {/* 3. Step Category Composition & Trend Section */}
      <StepCategoryTrend
        suites={suites}
        history={history}
        onOpenGuide={() => setStepCategoryModalOpen(true)}
      />

      {/* Interactive Modal Guides */}
      {guidesElement}
    </div>
  );
}
