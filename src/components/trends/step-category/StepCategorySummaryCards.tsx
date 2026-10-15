import { STEP_CATEGORIES, type StepCategoryKey } from '@/lib/stepCategoryClassifier';

export interface StepCategorySummaryCardsProps {
  currentPercentages: Record<StepCategoryKey, number>;
  currentCounts: Record<StepCategoryKey, number>;
  totalCurrentSteps: number;
}

export function StepCategorySummaryCards({
  currentPercentages,
  currentCounts,
  totalCurrentSteps,
}: StepCategorySummaryCardsProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
      {STEP_CATEGORIES.map((cat) => {
        const percent = currentPercentages[cat.key] || 0;
        const count = currentCounts[cat.key] || 0;
        return (
          <div
            key={cat.key}
            className="rounded-md border border-border-default bg-canvas p-3 shadow-xs"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-text-body-mid dark:text-text-muted truncate pr-1">
                {cat.label}
              </span>
              <span
                className="h-2 w-2 rounded-full shrink-0"
                style={{ backgroundColor: cat.color }}
              />
            </div>
            <div className="mt-2 flex items-baseline gap-1.5 flex-wrap">
              <span
                className={`text-lg font-bold ${
                  cat.key === 'waits' && percent > 15
                    ? 'text-warning-600 dark:text-warning-500'
                    : 'text-text-ink dark:text-text-on-primary'
                }`}
              >
                {percent}%
              </span>
              <span
                className={`text-[11px] font-medium ${
                  cat.key === 'assertions'
                    ? 'text-success-600 dark:text-success-500'
                    : 'text-text-body-mid dark:text-text-muted'
                }`}
              >
                {totalCurrentSteps > 0 ? `${count} steps` : 'Active'}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
