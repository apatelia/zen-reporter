import type { StepCategoryKey } from './stepCategoryClassifier';

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
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
      <div className="rounded-md border border-border-default bg-canvas p-3.5 shadow-xs">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-text-body-mid dark:text-text-muted">
            Assertions Ratio
          </span>
          <span
            className="h-2 w-2 rounded-full"
            style={{ backgroundColor: 'var(--color-success-500, #00754a)' }}
          />
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-xl font-bold text-text-ink dark:text-text-on-primary">
            {currentPercentages.assertions}%
          </span>
          <span className="text-[11px] font-medium text-success-600 dark:text-success-500">
            {totalCurrentSteps > 0 ? `${currentCounts.assertions} steps` : 'Active'}
          </span>
        </div>
      </div>

      <div className="rounded-md border border-border-default bg-canvas p-3.5 shadow-xs">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-text-body-mid dark:text-text-muted">
            User Actions
          </span>
          <span
            className="h-2 w-2 rounded-full"
            style={{ backgroundColor: 'var(--color-surface-700, #2b5148)' }}
          />
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-xl font-bold text-text-ink dark:text-text-on-primary">
            {currentPercentages.actions}%
          </span>
          <span className="text-[11px] font-medium text-text-body-mid dark:text-text-muted">
            {totalCurrentSteps > 0 ? `${currentCounts.actions} steps` : 'Active'}
          </span>
        </div>
      </div>

      <div className="rounded-md border border-border-default bg-canvas p-3.5 shadow-xs">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-text-body-mid dark:text-text-muted">
            Network / API
          </span>
          <span
            className="h-2 w-2 rounded-full"
            style={{ backgroundColor: 'var(--color-warning-500, #cba258)' }}
          />
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-xl font-bold text-text-ink dark:text-text-on-primary">
            {currentPercentages.network}%
          </span>
          <span className="text-[11px] font-medium text-text-body-mid dark:text-text-muted">
            {totalCurrentSteps > 0 ? `${currentCounts.network} steps` : 'Active'}
          </span>
        </div>
      </div>

      <div className="rounded-md border border-border-default bg-canvas p-3.5 shadow-xs">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-text-body-mid dark:text-text-muted">
            Explicit Waits
          </span>
          <span
            className="h-2 w-2 rounded-full"
            style={{ backgroundColor: 'var(--color-accent-orange, #ff6b00)' }}
          />
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span
            className={`text-xl font-bold ${
              currentPercentages.waits > 15
                ? 'text-warning-600 dark:text-warning-500'
                : 'text-text-ink dark:text-text-on-primary'
            }`}
          >
            {currentPercentages.waits}%
          </span>
          <span className="text-[11px] font-medium text-text-body-mid dark:text-text-muted">
            {totalCurrentSteps > 0 ? `${currentCounts.waits} steps` : 'Active'}
          </span>
        </div>
      </div>
    </div>
  );
}
