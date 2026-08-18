export const TAG_COLORS = [
  {
    bg: 'bg-[#d4e9e2] dark:bg-[#112922]',
    text: 'text-[#004d33] dark:text-[#4ade80]',
    ring: 'ring-[#94cfbd] dark:ring-[#00754A]/40',
  },
  {
    bg: 'bg-[#faf6ee] dark:bg-[#332714]',
    text: 'text-[#593c09] dark:text-[#fcd34d]',
    ring: 'ring-[#dfc49d] dark:ring-[#cba258]/40',
  },
  {
    bg: 'bg-[#e6eeeb] dark:bg-[#183a30]',
    text: 'text-[#0e241f] dark:text-[#a7f3d0]',
    ring: 'ring-[#b8d1c9] dark:ring-[#00a86b]/40',
  },
  {
    bg: 'bg-[#fdf2f2] dark:bg-[#361210]',
    text: 'text-[#8c0c05] dark:text-[#fca5a5]',
    ring: 'ring-[#fbe8e8] dark:ring-[#ef4444]/40',
  },
  {
    bg: 'bg-[#fff4ec] dark:bg-[#3a1d0d]',
    text: 'text-[#8a3b00] dark:text-[#ffb787]',
    ring: 'ring-[#ffd8be] dark:ring-[#ff6b00]/40',
  },
  {
    bg: 'bg-[#f3efff] dark:bg-[#2e1065]',
    text: 'text-[#4c1d95] dark:text-[#ddd6fe]',
    ring: 'ring-[#e9d5ff] dark:ring-[#7a3dff]/40',
  },
  {
    bg: 'bg-[#e0f2fe] dark:bg-[#0c4a6e]',
    text: 'text-[#075985] dark:text-[#bae6fd]',
    ring: 'ring-[#bae6fd] dark:ring-[#0284c7]/40',
  },
  {
    bg: 'bg-[#fce7f3] dark:bg-[#4c0519]',
    text: 'text-[#831843] dark:text-[#fbcfe8]',
    ring: 'ring-[#fbcfe8] dark:ring-[#ed52cb]/40',
  },
  {
    bg: 'bg-[#edebe9] dark:bg-[#142622]',
    text: 'text-[#1E3932] dark:text-[#e2e8f0]',
    ring: 'ring-[#d6dbde] dark:ring-[#376359]',
  },
  {
    bg: 'bg-[#e2e8f0] dark:bg-[#0f172a]',
    text: 'text-[#1e293b] dark:text-[#f1f5f9]',
    ring: 'ring-[#cbd5e1] dark:ring-[#334155]',
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
