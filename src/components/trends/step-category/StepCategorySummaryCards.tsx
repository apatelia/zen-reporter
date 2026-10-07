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
  const getCatColor = (key: StepCategoryKey) =>
    STEP_CATEGORIES.find((c) => c.key === key)?.color || '#888';

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
      <div className="rounded-md border border-border-default bg-canvas p-3 shadow-xs">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-text-body-mid dark:text-text-muted truncate pr-1">
            Assertions Ratio
          </span>
          <span
            className="h-2 w-2 rounded-full shrink-0"
            style={{ backgroundColor: getCatColor('assertions') }}
          />
        </div>
        <div className="mt-2 flex items-baseline gap-1.5 flex-wrap">
          <span className="text-lg font-bold text-text-ink dark:text-text-on-primary">
            {currentPercentages.assertions}%
          </span>
          <span className="text-[11px] font-medium text-success-600 dark:text-success-500">
            {totalCurrentSteps > 0 ? `${currentCounts.assertions} steps` : 'Active'}
          </span>
        </div>
      </div>

      <div className="rounded-md border border-border-default bg-canvas p-3 shadow-xs">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-text-body-mid dark:text-text-muted truncate pr-1">
            Hooks & Setup
          </span>
          <span
            className="h-2 w-2 rounded-full shrink-0"
            style={{ backgroundColor: getCatColor('hooks') }}
          />
        </div>
        <div className="mt-2 flex items-baseline gap-1.5 flex-wrap">
          <span className="text-lg font-bold text-text-ink dark:text-text-on-primary">
            {currentPercentages.hooks}%
          </span>
          <span className="text-[11px] font-medium text-text-body-mid dark:text-text-muted">
            {totalCurrentSteps > 0 ? `${currentCounts.hooks} steps` : 'Active'}
          </span>
        </div>
      </div>

      <div className="rounded-md border border-border-default bg-canvas p-3 shadow-xs">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-text-body-mid dark:text-text-muted truncate pr-1">
            Network / API
          </span>
          <span
            className="h-2 w-2 rounded-full shrink-0"
            style={{ backgroundColor: getCatColor('network') }}
          />
        </div>
        <div className="mt-2 flex items-baseline gap-1.5 flex-wrap">
          <span className="text-lg font-bold text-text-ink dark:text-text-on-primary">
            {currentPercentages.network}%
          </span>
          <span className="text-[11px] font-medium text-text-body-mid dark:text-text-muted">
            {totalCurrentSteps > 0 ? `${currentCounts.network} steps` : 'Active'}
          </span>
        </div>
      </div>

      <div className="rounded-md border border-border-default bg-canvas p-3 shadow-xs">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-text-body-mid dark:text-text-muted truncate pr-1">
            User Actions
          </span>
          <span
            className="h-2 w-2 rounded-full shrink-0"
            style={{ backgroundColor: getCatColor('actions') }}
          />
        </div>
        <div className="mt-2 flex items-baseline gap-1.5 flex-wrap">
          <span className="text-lg font-bold text-text-ink dark:text-text-on-primary">
            {currentPercentages.actions}%
          </span>
          <span className="text-[11px] font-medium text-text-body-mid dark:text-text-muted">
            {totalCurrentSteps > 0 ? `${currentCounts.actions} steps` : 'Active'}
          </span>
        </div>
      </div>

      <div className="rounded-md border border-border-default bg-canvas p-3 shadow-xs">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-text-body-mid dark:text-text-muted truncate pr-1">
            Explicit Waits
          </span>
          <span
            className="h-2 w-2 rounded-full shrink-0"
            style={{ backgroundColor: getCatColor('waits') }}
          />
        </div>
        <div className="mt-2 flex items-baseline gap-1.5 flex-wrap">
          <span
            className={`text-lg font-bold ${
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

      <div className="rounded-md border border-border-default bg-canvas p-3 shadow-xs">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-text-body-mid dark:text-text-muted truncate pr-1">
            Other Steps
          </span>
          <span
            className="h-2 w-2 rounded-full shrink-0"
            style={{ backgroundColor: getCatColor('others') }}
          />
        </div>
        <div className="mt-2 flex items-baseline gap-1.5 flex-wrap">
          <span className="text-lg font-bold text-text-ink dark:text-text-on-primary">
            {currentPercentages.others}%
          </span>
          <span className="text-[11px] font-medium text-text-body-mid dark:text-text-muted">
            {totalCurrentSteps > 0 ? `${currentCounts.others} steps` : 'Active'}
          </span>
        </div>
      </div>
    </div>
  );
}
