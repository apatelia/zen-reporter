export const TAG_COLORS = [
  {
    bg: 'bg-success-50 dark:bg-success-50',
    text: 'text-success-700 dark:text-success-500',
    ring: 'ring-success-200 dark:ring-success-500/40',
  },
  {
    bg: 'bg-warning-50 dark:bg-warning-50',
    text: 'text-warning-700 dark:text-warning-500',
    ring: 'ring-warning-200 dark:ring-warning-500/40',
  },
  {
    bg: 'bg-info-50 dark:bg-info-50',
    text: 'text-info-700 dark:text-info-500',
    ring: 'ring-info-100 dark:ring-info-500/40',
  },
  {
    bg: 'bg-danger-50 dark:bg-danger-50',
    text: 'text-danger-700 dark:text-danger-500',
    ring: 'ring-danger-100 dark:ring-danger-500/40',
  },
  {
    bg: 'bg-surface-100 dark:bg-surface-100',
    text: 'text-text-ink dark:text-text-ink',
    ring: 'ring-border-default dark:ring-border-default',
  },
  {
    bg: 'bg-success-100 dark:bg-success-100',
    text: 'text-success-600 dark:text-success-500',
    ring: 'ring-success-200 dark:ring-success-600/40',
  },
  {
    bg: 'bg-warning-100 dark:bg-warning-100',
    text: 'text-warning-600 dark:text-warning-500',
    ring: 'ring-warning-200 dark:ring-warning-600/40',
  },
  {
    bg: 'bg-info-100 dark:bg-info-100',
    text: 'text-info-600 dark:text-info-500',
    ring: 'ring-info-500/20 dark:ring-info-600/40',
  },
  {
    bg: 'bg-danger-100 dark:bg-danger-100',
    text: 'text-danger-600 dark:text-danger-500',
    ring: 'ring-danger-200 dark:ring-danger-600/40',
  },
  {
    bg: 'bg-surface-200 dark:bg-surface-200',
    text: 'text-text-body-mid dark:text-text-body-mid',
    ring: 'ring-border-chart dark:ring-border-chart',
  },
];

// Global tag → color mapping
const tagColorMap = new Map<string, number>();
let nextColorIndex = 0;

/**
 * Get color for a tag. First time a tag is seen, assigns the next available color.
 * Once assigned, a tag always returns the same color.
 * Colors cycle after 10 unique tags.
 */
export function getTagColor(tag: string) {
  if (tagColorMap.has(tag)) {
    return TAG_COLORS[tagColorMap.get(tag)!];
  }
  const colorIndex = nextColorIndex % TAG_COLORS.length;
  tagColorMap.set(tag, colorIndex);
  nextColorIndex++;
  return TAG_COLORS[colorIndex];
}

/**
 * Reset the global tag color assignment. Useful for testing or re-rendering.
 */
export function resetTagColors() {
  tagColorMap.clear();
  nextColorIndex = 0;
}
