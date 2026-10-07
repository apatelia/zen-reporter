import LearnMoreButton from '@/components/shared/LearnMoreButton';
import {
  countStepCategories,
  STEP_CATEGORIES,
  StepCategoryKey,
} from '@/lib/stepCategoryClassifier';
import type { HistoryData } from '@/lib/types/history';
import type { TestSuite } from '@/lib/types/report';
import { useMemo, useState } from 'react';
import { StepCategoryChart, type StepCategoryChartPoint } from './step-category/StepCategoryChart';
import { StepCategorySummaryCards } from './step-category/StepCategorySummaryCards';

export {
  classifyStepTitle,
  countStepCategories,
  STEP_CATEGORIES,
} from '@/lib/stepCategoryClassifier';
export type { StepCategoryConfig, StepCategoryKey } from '@/lib/stepCategoryClassifier';

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

  const currentCounts = useMemo(() => countStepCategories(suites), [suites]);

  const totalCurrentSteps = useMemo(() => {
    return Object.values(currentCounts).reduce((sum, n) => sum + n, 0);
  }, [currentCounts]);

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
        <div className="inline-flex items-center rounded-md border border-border-default bg-surface-100 p-0.5 text-xs font-semibold shrink-0">
          <button
            type="button"
            onClick={() => setViewMode('percent')}
            className={`px-3 py-1 rounded transition-colors cursor-pointer ${
              viewMode === 'percent'
                ? 'bg-canvas dark:bg-surface-200 border border-border-active text-text-ink dark:text-text-on-primary shadow-xs font-bold'
                : 'border border-transparent text-text-body-mid hover:text-text-ink dark:text-text-on-primary font-medium'
            }`}
          >
            % Normalized
          </button>
          <button
            type="button"
            onClick={() => setViewMode('count')}
            className={`px-3 py-1 rounded transition-colors cursor-pointer ${
              viewMode === 'count'
                ? 'bg-canvas dark:bg-surface-200 border border-border-active text-text-ink dark:text-text-on-primary shadow-xs font-bold'
                : 'border border-transparent text-text-body-mid hover:text-text-ink dark:text-text-on-primary font-medium'
            }`}
          >
            Step Count
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <StepCategorySummaryCards
        currentPercentages={currentPercentages}
        currentCounts={currentCounts}
        totalCurrentSteps={totalCurrentSteps}
      />

      {/* Recharts Stacked Bar Trend Chart */}
      <StepCategoryChart chartData={chartData} viewMode={viewMode} />
    </section>
  );
}
