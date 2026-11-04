import LearnMoreButton from '@/components/shared/LearnMoreButton';
import { countStepCategories, STEP_CATEGORIES, StepCategoryKey } from '@arpanp/zen-core';
import type { HistoryData } from '@arpanp/zen-core';
import type { TestSuite } from '@arpanp/zen-core';
import { useEffect, useMemo, useRef, useState } from 'react';
import { StepCategoryChart, type StepCategoryChartPoint } from './step-category/StepCategoryChart';
import { StepCategorySummaryCards } from './step-category/StepCategorySummaryCards';

export { classifyStepTitle, countStepCategories, STEP_CATEGORIES } from '@arpanp/zen-core';
export type { StepCategoryConfig, StepCategoryKey } from '@arpanp/zen-core';

export interface StepCategoryTrendProps {
  suites: TestSuite[];
  history?: HistoryData | null;
  onOpenGuide?: () => void;
}

export default function StepCategoryTrend({
  suites,
  history,
  onOpenGuide,
}: StepCategoryTrendProps) {
  const [viewMode, setViewMode] = useState<'percent' | 'count'>('percent');
  const viewModeContainerRef = useRef<HTMLDivElement>(null);
  const viewModeButtonsRef = useRef<Record<string, HTMLButtonElement | null>>({});
  const [viewModeIndicator, setViewModeIndicator] = useState<{
    left: number;
    top: number;
    width: number;
    height: number;
    opacity: number;
  }>({ left: 0, top: 0, width: 0, height: 0, opacity: 0 });

  useEffect(() => {
    const updateIndicator = () => {
      const container = viewModeContainerRef.current;
      const activeButton = viewModeButtonsRef.current[viewMode];
      if (!container || !activeButton) return;

      const containerRect = container.getBoundingClientRect();
      const activeRect = activeButton.getBoundingClientRect();

      setViewModeIndicator({
        left: activeRect.left - containerRect.left - container.clientLeft,
        top: activeRect.top - containerRect.top - container.clientTop,
        width: activeRect.width,
        height: activeRect.height,
        opacity: 1,
      });
    };

    updateIndicator();
    window.addEventListener('resize', updateIndicator);
    return () => window.removeEventListener('resize', updateIndicator);
  }, [viewMode]);

  const currentCounts = useMemo(() => countStepCategories(suites), [suites]);

  const totalCurrentSteps = useMemo(() => {
    return Object.values(currentCounts).reduce((sum, n) => sum + n, 0);
  }, [currentCounts]);

  const hasHistoricalStepData = useMemo(() => {
    if (!history?.runs || history.runs.length === 0) return false;
    return history.runs.some((run) => {
      if (!run.step_categories) return false;
      return Object.values(run.step_categories).reduce((sum, n) => sum + n, 0) > 0;
    });
  }, [history]);

  const hasAnyStepData = totalCurrentSteps > 0 || hasHistoricalStepData;

  const currentPercentages = useMemo(() => {
    if (totalCurrentSteps === 0) {
      return { assertions: 0, actions: 0, network: 0, hooks: 0, waits: 0, others: 0 };
    }
    const res: Record<StepCategoryKey, number> = {
      assertions: 0,
      actions: 0,
      network: 0,
      hooks: 0,
      waits: 0,
      others: 0,
    };
    for (const cat of STEP_CATEGORIES) {
      res[cat.key] = Math.round((currentCounts[cat.key] / totalCurrentSteps) * 1000) / 10;
    }
    return res;
  }, [currentCounts, totalCurrentSteps]);

  const chartData = useMemo<StepCategoryChartPoint[]>(() => {
    const runsList = history?.runs && history.runs.length > 0 ? history.runs.slice(-15) : [];

    if (runsList.length === 0) {
      const currentPoint: StepCategoryChartPoint = {
        name: 'Current Run',
        hasStepData: totalCurrentSteps > 0,
      };

      for (const cat of STEP_CATEGORIES) {
        currentPoint[cat.label] =
          viewMode === 'percent' ? currentPercentages[cat.key] : currentCounts[cat.key];
      }

      return [currentPoint];
    }

    return runsList.map((run, idx) => {
      const isLatest = idx === runsList.length - 1;
      const name = isLatest ? 'Current Run' : run.started_at || run.run_name || `Run #${idx + 1}`;

      const item: StepCategoryChartPoint = {
        name,
        started_at: run.started_at,
        run_total: run.run_total,
      };

      if (isLatest) {
        item.hasStepData = totalCurrentSteps > 0;
        for (const cat of STEP_CATEGORIES) {
          item[cat.label] =
            viewMode === 'percent' ? currentPercentages[cat.key] : currentCounts[cat.key];
        }
      } else if (run.step_categories) {
        // Use exact recorded step category counts/percentages
        const catCounts = run.step_categories;
        const totalSteps = Object.values(catCounts).reduce((sum, n) => sum + n, 0);
        item.hasStepData = totalSteps > 0;

        for (const cat of STEP_CATEGORIES) {
          const rawCount = catCounts[cat.key] || 0;
          if (viewMode === 'percent') {
            item[cat.label] = totalSteps > 0 ? Math.round((rawCount / totalSteps) * 1000) / 10 : 0;
          } else {
            item[cat.label] = rawCount;
          }
        }
      } else {
        // Historical runs recorded without step category breakdown
        item.hasStepData = false;
        for (const cat of STEP_CATEGORIES) {
          item[cat.label] = 0;
        }
      }

      return item;
    });
  }, [history, currentCounts, currentPercentages, totalCurrentSteps, viewMode]);

  return (
    <section className="rounded-md border border-border-default bg-surface-50 p-5 shadow-xs space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="text-lg font-bold text-text-ink dark:text-text-on-primary">
              Step Category Composition & Trend
            </h2>
            {onOpenGuide && <LearnMoreButton onClick={onOpenGuide} />}
          </div>
          <p className="mt-1 text-xs text-text-body-mid dark:text-text-muted">
            Proportional breakdown of automated step types (Assertions, Actions, Network, Waits)
            across historical runs
          </p>
        </div>

        {/* View Mode Toggle */}
        <div
          ref={viewModeContainerRef}
          className="relative inline-flex items-center rounded-lg border border-border-default bg-surface-100 dark:bg-surface-950/70 p-0.5 text-xs font-semibold shrink-0 shadow-2xs"
        >
          {/* Sliding Active Pill Indicator */}
          <div
            aria-hidden="true"
            style={{
              transform: `translate3d(${viewModeIndicator.left}px, ${viewModeIndicator.top}px, 0)`,
              width: `${viewModeIndicator.width}px`,
              height: `${viewModeIndicator.height}px`,
              opacity: viewModeIndicator.opacity,
            }}
            className="pointer-events-none absolute left-0 top-0 rounded-md bg-canvas shadow-xs ring-1 ring-border-default/80 dark:bg-surface-200 dark:ring-1 dark:ring-white/20 dark:shadow-md transition-all duration-250 ease-[cubic-bezier(0.2,0,0,1)]"
          />

          <button
            ref={(el) => {
              viewModeButtonsRef.current['percent'] = el;
            }}
            type="button"
            onClick={() => setViewMode('percent')}
            className={`relative z-10 px-3 py-1 text-xs font-semibold rounded-md transition-colors duration-150 cursor-pointer ${
              viewMode === 'percent'
                ? 'text-text-ink dark:text-text-on-primary'
                : 'text-text-body-mid hover:text-text-ink hover:bg-surface-200/40 dark:text-text-muted dark:hover:text-text-on-primary'
            }`}
          >
            % Normalized
          </button>
          <button
            ref={(el) => {
              viewModeButtonsRef.current['count'] = el;
            }}
            type="button"
            onClick={() => setViewMode('count')}
            className={`relative z-10 px-3 py-1 text-xs font-semibold rounded-md transition-colors duration-150 cursor-pointer ${
              viewMode === 'count'
                ? 'text-text-ink dark:text-text-on-primary'
                : 'text-text-body-mid hover:text-text-ink hover:bg-surface-200/40 dark:text-text-muted dark:hover:text-text-on-primary'
            }`}
          >
            Step Count
          </button>
        </div>
      </div>

      {/* Summary Cards - only shown when there are steps detected */}
      {hasAnyStepData && (
        <StepCategorySummaryCards
          currentPercentages={currentPercentages}
          currentCounts={currentCounts}
          totalCurrentSteps={totalCurrentSteps}
        />
      )}

      {/* Recharts Stacked Bar Trend Chart or Empty State */}
      {!hasAnyStepData ? (
        <div className="flex h-72 flex-col items-center justify-center rounded-md border border-dashed border-border-default bg-surface-100/50 p-6 text-center">
          <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-surface-200 text-text-muted">
            <svg
              className="h-5 w-5 text-text-body-mid dark:text-text-muted"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5m.75-9l3-3 2.143 2.143L15.75 6"
              />
            </svg>
          </div>
          <p className="text-sm font-semibold text-text-ink dark:text-text-on-primary">
            No step data available for current run
          </p>
          <p className="mt-1 text-xs text-text-body-mid dark:text-text-muted">
            No test steps were executed or recorded for this run.
          </p>
        </div>
      ) : (
        <StepCategoryChart chartData={chartData} viewMode={viewMode} />
      )}
    </section>
  );
}
