export interface PassRateBadgeProps {
  passRate: number | null;
  className?: string;
}

/**
 * Renders a color-coded percentage badge for test pass rates (Green >= 90%, Amber >= 60%, Red < 60%).
 */
export function PassRateBadge({ passRate, className = '' }: PassRateBadgeProps) {
  if (passRate === null) return <span>-</span>;

  const colorClass =
    passRate >= 90
      ? 'bg-success-50 text-success-700 dark:bg-success-500/20 dark:text-success-500'
      : passRate >= 60
        ? 'bg-warning-50 text-warning-700 dark:bg-warning-500/20 dark:text-warning-500'
        : 'bg-danger-50 text-danger-700 dark:bg-danger-500/20 dark:text-danger-500';

  return (
    <span className={`inline-block px-2 py-0.5 rounded font-bold ${colorClass} ${className}`}>
      {passRate}%
    </span>
  );
}

export default PassRateBadge;
