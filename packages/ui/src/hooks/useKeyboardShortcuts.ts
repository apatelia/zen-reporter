import { useEffect, useRef } from 'react';

export interface ShortcutHandlers {
  onToggleSidebar?: () => void;
  onSelectTabByIndex?: (index: number) => void;
  onNextTab?: () => void;
  onPrevTab?: () => void;
  onToggleDarkMode?: () => void;
  onCycleTheme?: () => void;
  onOpenRunSwitcher?: () => void;
  onOpenConfigGenerator?: () => void;
  onOpenHelp?: () => void;
  onCopyCommit?: () => void;
  onCopyBranch?: () => void;
  onOpenWebsite?: () => void;
  onFocusSearch?: () => void;
  onScrollToTop?: () => void;
  onPrevPage?: () => void;
  onNextPage?: () => void;
  isModalOpen?: boolean;
}

function isInputElement(target: EventTarget | null): boolean {
  if (!target || !(target instanceof HTMLElement)) return false;
  const tagName = target.tagName;
  return (
    tagName === 'INPUT' ||
    tagName === 'TEXTAREA' ||
    tagName === 'SELECT' ||
    target.isContentEditable ||
    Boolean(target.closest('[contenteditable="true"]'))
  );
}

/**
 * Sets up global single-key keyboard shortcuts for dashboard navigation, theme switching,
 * search focus, and modal control.
 *
 * @param handlers - Mapping of shortcut action callbacks and modal state flag.
 */
export function useKeyboardShortcuts(handlers: ShortcutHandlers) {
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  const isModalOpen = handlers.isModalOpen ?? false;

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // 1. Never intercept when typing into any input, select, textarea or contenteditable element
      if (isInputElement(event.target)) {
        return;
      }

      // If modifier keys are held (Ctrl, Meta, Alt), do not process single-key shortcuts
      if (event.ctrlKey || event.metaKey || event.altKey) {
        return;
      }

      // If a modal is open, ignore navigation single-key shortcuts so typing or esc inside modal is preserved
      if (isModalOpen) {
        return;
      }

      const key = event.key;
      const currentHandlers = handlersRef.current;

      // Single-key navigation shortcuts
      switch (key) {
        // Tab jumping: 1 to 8
        case '1':
        case '2':
        case '3':
        case '4':
        case '5':
        case '6':
        case '7':
        case '8': {
          const index = parseInt(key, 10) - 1;
          event.preventDefault();
          if (document.activeElement instanceof HTMLElement) {
            document.activeElement.blur();
          }
          currentHandlers.onSelectTabByIndex?.(index);
          break;
        }

        // Sequential tab cycling
        case '[': {
          event.preventDefault();
          if (document.activeElement instanceof HTMLElement) {
            document.activeElement.blur();
          }
          currentHandlers.onPrevTab?.();
          break;
        }
        case ']': {
          event.preventDefault();
          if (document.activeElement instanceof HTMLElement) {
            document.activeElement.blur();
          }
          currentHandlers.onNextTab?.();
          break;
        }

        // Toggle sidebar collapse
        case '\\': {
          event.preventDefault();
          currentHandlers.onToggleSidebar?.();
          break;
        }

        // Dark mode cycle (Light -> Dark -> System)
        case 'd':
        case 'D': {
          event.preventDefault();
          currentHandlers.onToggleDarkMode?.();
          break;
        }

        // Theme palette cycle (Sage -> Lotus -> Oasis)
        case 't':
        case 'T': {
          event.preventDefault();
          currentHandlers.onCycleTheme?.();
          break;
        }

        // Config Generator modal
        case 'c':
        case 'C': {
          event.preventDefault();
          currentHandlers.onOpenConfigGenerator?.();
          break;
        }

        // Run switcher / Search quick access
        case '/': {
          event.preventDefault();
          currentHandlers.onOpenRunSwitcher?.();
          break;
        }

        // Focus table search input
        case 'f':
        case 'F': {
          event.preventDefault();
          currentHandlers.onFocusSearch?.();
          break;
        }

        // Copy git commit hash
        case 'g':
        case 'G': {
          event.preventDefault();
          currentHandlers.onCopyCommit?.();
          break;
        }

        // Copy git branch name
        case 'b':
        case 'B': {
          event.preventDefault();
          currentHandlers.onCopyBranch?.();
          break;
        }

        // Open Zen Reporter website
        case 'z':
        case 'Z': {
          event.preventDefault();
          currentHandlers.onOpenWebsite?.();
          break;
        }

        // Return to top of the page
        case 'r':
        case 'R': {
          event.preventDefault();
          currentHandlers.onScrollToTop?.();
          break;
        }

        // Previous page in table pagination
        case 'p':
        case 'P': {
          event.preventDefault();
          currentHandlers.onPrevPage?.();
          break;
        }

        // Next page in table pagination
        case 'n':
        case 'N': {
          event.preventDefault();
          currentHandlers.onNextPage?.();
          break;
        }

        // Cheatsheet modal
        case '?': {
          event.preventDefault();
          currentHandlers.onOpenHelp?.();
          break;
        }

        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isModalOpen]);
}
