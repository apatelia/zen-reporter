import type { TestSuite } from '@/lib/types/report';
import {
  collectAllCases,
  computeProjectStats,
  computeProjectExecutiveKPIs,
} from '@/lib/statsUtils';
import ProjectBarCharts from '@/components/projects/ProjectBarCharts';
import ProjectsOverviewCards from '@/components/projects/ProjectsOverviewCards';
import ProjectVolumeCoverageChart from '@/components/projects/ProjectVolumeCoverageChart';
import ProjectDetailCards from '@/components/projects/ProjectDetailCards';

export interface ProjectsSectionProps {
  suites: TestSuite[];
}

export default function ProjectsSection({ suites }: ProjectsSectionProps) {
  const allCases = collectAllCases(suites);
  const projectStats = computeProjectStats(allCases);
  const executiveKPIs = computeProjectExecutiveKPIs(projectStats);

  return (
    <div className="w-full space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-text-ink dark:text-text-on-primary sm:text-3xl">
          Projects Overview
        </h2>
        <p className="mt-1 text-sm text-text-body-mid dark:text-text-muted">
          Execution breakdown, status metrics, and cross-project test results.
        </p>
      </div>

      {/* 1. Top Executive KPI Cards */}
      <ProjectsOverviewCards kpis={executiveKPIs} />

      {/* 2. Visual Charts Row (Status Breakdown + Test Volume & Coverage Density) */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 items-stretch">
        <ProjectBarCharts suites={suites} title="Status Breakdown by Project" />
        <ProjectVolumeCoverageChart
          projectStats={projectStats}
          title="Test Volume & Coverage Density per Project"
        />
      </div>

      {/* 3. Detailed Environment Cards & Failure Breakdown */}
      <ProjectDetailCards projectStats={projectStats} />
    </div>
  );
}
