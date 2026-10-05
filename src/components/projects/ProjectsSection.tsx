import { useState } from 'react';
import ProjectBarCharts from '@/components/projects/ProjectBarCharts';
import ProjectDetailCards from '@/components/projects/ProjectDetailCards';
import ProjectsOverviewCards from '@/components/projects/ProjectsOverviewCards';
import ProjectVolumeCoverageChart from '@/components/projects/ProjectVolumeCoverageChart';
import ProjectsGuides from '@/components/projects/ProjectsGuides';
import {
  collectAllCases,
  computeProjectExecutiveKPIs,
  computeProjectStats,
} from '@/lib/statsUtils';
import type { TestSuite } from '@/lib/types/report';

export interface ProjectsSectionProps {
  suites: TestSuite[];
}

export default function ProjectsSection({ suites }: ProjectsSectionProps) {
  const [statusBreakdownModalOpen, setStatusBreakdownModalOpen] = useState(false);
  const [volumeCoverageModalOpen, setVolumeCoverageModalOpen] = useState(false);
  const [projectHealthModalOpen, setProjectHealthModalOpen] = useState(false);

  const allCases = collectAllCases(suites);
  const projectStats = computeProjectStats(allCases);
  const executiveKPIs = computeProjectExecutiveKPIs(projectStats);

  return (
    <div className="w-full space-y-6">
      <h1 className="sr-only">Projects Overview</h1>

      {/* 1. Top Executive KPI Cards */}
      <ProjectsOverviewCards kpis={executiveKPIs} />

      {/* 2. Visual Charts Row (Status Breakdown + Test Volume & Coverage Density) */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 items-stretch">
        <ProjectBarCharts
          suites={suites}
          title="Status Breakdown by Project"
          onOpenGuide={() => setStatusBreakdownModalOpen(true)}
        />
        <ProjectVolumeCoverageChart
          projectStats={projectStats}
          title="Test Volume & Coverage Density per Project"
          onOpenGuide={() => setVolumeCoverageModalOpen(true)}
        />
      </div>

      {/* 3. Detailed Environment Cards & Failure Breakdown */}
      <ProjectDetailCards
        projectStats={projectStats}
        onOpenGuide={() => setProjectHealthModalOpen(true)}
      />

      {/* Interactive Modal Guides */}
      <ProjectsGuides
        statusBreakdownModalOpen={statusBreakdownModalOpen}
        onCloseStatusBreakdownModal={() => setStatusBreakdownModalOpen(false)}
        volumeCoverageModalOpen={volumeCoverageModalOpen}
        onCloseVolumeCoverageModal={() => setVolumeCoverageModalOpen(false)}
        projectHealthModalOpen={projectHealthModalOpen}
        onCloseProjectHealthModal={() => setProjectHealthModalOpen(false)}
      />
    </div>
  );
}
