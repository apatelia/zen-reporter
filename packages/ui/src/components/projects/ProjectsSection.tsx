import { useMemo, useState } from 'react';
import ProjectBarCharts from '@/components/projects/ProjectBarCharts';
import ProjectVolumeCoverageChart from '@/components/projects/ProjectVolumeCoverageChart';
import ProjectLatencySpreadChart from '@/components/projects/ProjectLatencySpreadChart';
import ProjectFlakyRateChart from '@/components/projects/ProjectFlakyRateChart';
import ProjectDetailCards from '@/components/projects/ProjectDetailCards';
import ProjectsOverviewCards from '@/components/projects/ProjectsOverviewCards';
import ProjectsGuides, { type ProjectModalType } from '@/components/projects/ProjectsGuides';
import {
  collectAllCases,
  computeProjectExecutiveKPIs,
  computeProjectStats,
} from '@arpanp/zen-core';
import type { TestSuite } from '@arpanp/zen-core';

export interface ProjectsSectionProps {
  suites: TestSuite[];
}

/**
 * Renders the Projects tab: executive KPIs, visual benchmark charts (status, volume, latency spread, and flakiness),
 * detailed project cards, and contextual guide modals.
 * @param suites - Test suites of the current run.
 * @returns The rendered Projects section.
 */
export default function ProjectsSection({ suites }: ProjectsSectionProps) {
  const [activeModal, setActiveModal] = useState<ProjectModalType>(null);

  const { projectStats, executiveKPIs } = useMemo(() => {
    const allCases = collectAllCases(suites);
    const stats = computeProjectStats(allCases);
    const kpis = computeProjectExecutiveKPIs(stats);
    return { projectStats: stats, executiveKPIs: kpis };
  }, [suites]);

  return (
    <div className="w-full space-y-6">
      <h1 className="sr-only">Projects Overview</h1>

      {/* 1. Top Executive KPI Cards */}
      <ProjectsOverviewCards kpis={executiveKPIs} />

      {/* 2. Visual Charts 2x2 Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 items-stretch">
        <ProjectBarCharts
          suites={suites}
          title="Status Breakdown by Project"
          onOpenGuide={() => setActiveModal('status-breakdown')}
        />
        <ProjectVolumeCoverageChart
          projectStats={projectStats}
          title="Test Volume & Coverage Density per Project"
          onOpenGuide={() => setActiveModal('volume-coverage')}
        />
        <ProjectLatencySpreadChart
          projectStats={projectStats}
          title="Duration Spread & P95 Latency by Project"
          onOpenGuide={() => setActiveModal('duration-benchmark')}
        />
        <ProjectFlakyRateChart
          projectStats={projectStats}
          title="Flaky Test Count & Retry Rate by Project"
          onOpenGuide={() => setActiveModal('project-flaky-rate')}
        />
      </div>

      {/* 3. Detailed Environment Cards & Failure Breakdown */}
      <ProjectDetailCards
        projectStats={projectStats}
        onOpenGuide={() => setActiveModal('project-health')}
      />

      {/* Interactive Modal Guides */}
      <ProjectsGuides activeModal={activeModal} onClose={() => setActiveModal(null)} />
    </div>
  );
}
