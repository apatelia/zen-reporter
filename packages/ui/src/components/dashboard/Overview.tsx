import { useMemo } from 'react';
import type { ResultSummary, TestSuite } from '@arpanp/zen-core';
import { collectAllCases } from '@arpanp/zen-core';
import TestResultsHero from './TestResultsHero';
import ParallelSpeedupCard from './ParallelSpeedupCard';
import TestSpeedConsistencyCard from './TestSpeedConsistencyCard';
import WorkerUtilizationCard from './WorkerUtilizationCard';

export interface OverviewProps {
  summary: ResultSummary;
  suites: TestSuite[];
  isMinimalReport?: boolean;
}

/**
 * Executive dashboard overview tab component.
 *
 * @param props - Component props containing summary, suites, and minimal report flag.
 * @returns React functional component rendering the Overview page.
 */
export default function Overview({ summary, suites, isMinimalReport }: OverviewProps) {
  const allCases = useMemo(() => collectAllCases(suites), [suites]);

  return (
    <div className="w-full space-y-6">
      <h1 className="sr-only">Overview</h1>

      {/* Section 1: Executive Test Results & Metadata Hero */}
      <section>
        <TestResultsHero summary={summary} suites={suites} />
      </section>

      {/* Section 2: Executive Diagnostics (Responsive 1/2/3-Column Grid) */}
      {!isMinimalReport && (
        <section className="space-y-3 pt-2">
          <div className="grid grid-cols-1 items-stretch gap-4 lg:grid-cols-2 2xl:grid-cols-3">
            <TestSpeedConsistencyCard allCases={allCases} />
            <ParallelSpeedupCard summary={summary} />
            <WorkerUtilizationCard summary={summary} allCases={allCases} />
          </div>
        </section>
      )}
    </div>
  );
}
