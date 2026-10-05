import type { ResultSummary, TestSuite } from '@/lib/types/report';
import TestResultsHero from './TestResultsHero';
import ExecutionTimingEfficiencyCard from './ExecutionTimingEfficiencyCard';
import TestHealthCard from './TestHealthCard';

export interface OverviewProps {
  summary: ResultSummary;
  suites: TestSuite[];
  isMinimalReport?: boolean;
}

export default function Overview({ summary, suites, isMinimalReport }: OverviewProps) {
  return (
    <div className="w-full space-y-6">
      <h1 className="sr-only">Overview</h1>

      {/* Section 1: Executive Test Results & Metadata Hero */}
      <section>
        <TestResultsHero summary={summary} suites={suites} />
      </section>

      {/* Section 2: Performance & Stability Analytics (2-Column Grid) */}
      {!isMinimalReport && (
        <section className="space-y-3 pt-4">
          <div className="flex items-center gap-2.5">
            <span className="text-sm font-bold uppercase tracking-wider text-text-muted">
              Performance & Stability Analytics
            </span>
            <div className="flex-1 h-px bg-border-default" />
          </div>

          <div className="grid grid-cols-1 items-stretch gap-4 lg:grid-cols-2">
            <ExecutionTimingEfficiencyCard summary={summary} suites={suites} />
            <TestHealthCard suites={suites} />
          </div>
        </section>
      )}
    </div>
  );
}
