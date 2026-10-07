import { STATUS_BADGE_STYLE_MAP, type StatusType } from '@/lib/theme';

export interface StatusCountBadgeProps {
  count: number;
  type: StatusType;
  className?: string;
  showZeroBadge?: boolean;
}

/**
 * Renders a pill badge displaying a test status count styled according to the status category theme.
 */
export function StatusCountBadge({
  count,
  type,
  className = '',
  showZeroBadge = false,
}: StatusCountBadgeProps) {
  if (count === 0 && !showZeroBadge) {
    return <span className={`text-text-muted-soft dark:text-text-muted ${className}`}>0</span>;
  }
  return (
    <span
      className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ring-1 ${STATUS_BADGE_STYLE_MAP[type]} ${className}`}
    >
      {count}
    </span>
  );
}

export default StatusCountBadge;
