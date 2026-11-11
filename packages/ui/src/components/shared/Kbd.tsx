import React from 'react';

export interface KbdProps extends React.HTMLAttributes<HTMLElement> {
  /** The key string or symbol to display (e.g., '1', 'Esc', '←', 'Ctrl') */
  children: React.ReactNode;
  /** Size variant */
  size?: 'sm' | 'md';
  /** Visual variant */
  variant?: 'default' | 'keycap';
  /** Whether to prefix with a subtle keyboard icon */
  showKeyboardIcon?: boolean;
  /** When true, disables the 3D pressed-key look of the keycap variant (no thick bottom border or shadow) */
  flat?: boolean;
  /** Optional title attribute tooltip */
  title?: string;
  className?: string;
}

/**
 * Normalizes common directional arrow keys into crisp SVG arrow icons
 * to avoid font vertical alignment quirks where arrow glyphs sit off-center.
 *
 * @param content - Node content or key string to format.
 * @param size - Size variant ('sm' | 'md') determining icon dimensions.
 * @returns Formatted ReactNode (SVG icon or original content).
 */
function renderKeyContent(content: React.ReactNode, size: 'sm' | 'md'): React.ReactNode {
  if (typeof content === 'string') {
    const iconSize = size === 'sm' ? 'h-2.5 w-2.5' : 'h-3 w-3';
    switch (content.trim()) {
      case '←':
      case 'Left':
      case 'ArrowLeft':
        return (
          <svg
            className={iconSize}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <line x1="19" y1="12" x2="5" y2="12" />
            <polyline points="12 19 5 12 12 5" />
          </svg>
        );
      case '→':
      case 'Right':
      case 'ArrowRight':
        return (
          <svg
            className={iconSize}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <line x1="5" y1="12" x2="19" y2="12" />
            <polyline points="12 5 19 12 12 19" />
          </svg>
        );
      case '↑':
      case 'Up':
      case 'ArrowUp':
        return (
          <svg
            className={iconSize}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <line x1="12" y1="19" x2="12" y2="5" />
            <polyline points="5 12 12 5 19 12" />
          </svg>
        );
      case '↓':
      case 'Down':
      case 'ArrowDown':
        return (
          <svg
            className={iconSize}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <line x1="12" y1="5" x2="12" y2="19" />
            <polyline points="19 12 12 19 5 12" />
          </svg>
        );
      default:
        break;
    }
  }
  return content;
}

/**
 * Reusable, pixel-aligned keyboard shortcut component.
 * Solves baseline misalignment, font quirks with arrows, and vertical centering.
 *
 * @param props - Properties for the keyboard shortcut element.
 * @param props.children - Key string or symbol to display (e.g., '1', 'Esc', '←', 'Ctrl').
 * @param props.size - Size variant ('sm' | 'md') controlling height, min-width, and font size.
 * @param props.variant - Visual variant ('default' | 'keycap'); keycap adds a pressed-key bottom border and shadow.
 * @param props.showKeyboardIcon - When true, prefixes the key with a subtle keyboard icon.
 * @param props.flat - When true, renders the keycap variant without its 3D pressed-key styling.
 * @param props.title - Optional tooltip text shown on hover.
 * @param props.className - Additional CSS classes appended to the element.
 * @returns The rendered <kbd> element.
 */
export const Kbd: React.FC<KbdProps> = ({
  children,
  size = 'sm',
  variant = 'default',
  showKeyboardIcon = false,
  flat = false,
  title,
  className = '',
  ...rest
}) => {
  const sizeClasses =
    size === 'sm' ? 'h-4.5 min-w-4.5 px-1.5 text-[10px]' : 'h-5 min-w-5 px-1.5 text-[11px]';

  const keyboardIconSize = size === 'sm' ? 'h-2.5 w-2.5' : 'h-3 w-3';

  const variantClasses =
    variant === 'keycap'
      ? `text-text-ink dark:text-text-on-primary border border-border-default bg-surface-50 dark:bg-surface-200${
          flat ? '' : ' border-b-[2px] shadow-2xs'
        }`
      : 'text-text-ink dark:text-text-on-primary border border-border-default bg-surface-100 dark:bg-surface-200/50 shadow-2xs';

  return (
    <kbd
      title={title}
      className={`inline-flex items-center justify-center gap-1 rounded font-mono font-medium leading-none select-none shrink-0 ${sizeClasses} ${variantClasses} ${className}`}
      {...rest}
    >
      {showKeyboardIcon && (
        <svg
          className={`${keyboardIconSize} shrink-0 opacity-70`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
          aria-hidden="true"
        >
          <rect x="2" y="4" width="20" height="16" rx="2" />
          <path d="M6 8h.001M10 8h.001M14 8h.001M18 8h.001M6 12h.001M10 12h.001M14 12h.001M18 12h.001M7 16h10" />
        </svg>
      )}
      {renderKeyContent(children, size)}
    </kbd>
  );
};

export default Kbd;
