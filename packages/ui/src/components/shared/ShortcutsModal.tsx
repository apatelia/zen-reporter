import BaseModal from '@/components/shared/BaseModal';
import Kbd from '@/components/shared/Kbd';

export interface ShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ShortcutItem {
  keyDesc: string[];
  description: string;
}

interface ShortcutSection {
  title: string;
  shortcuts: ShortcutItem[];
}

const SHORTCUT_SECTIONS: ShortcutSection[] = [
  {
    title: 'Appearance & Themes',
    shortcuts: [
      { keyDesc: ['D'], description: 'Cycle dark mode (System → Light → Dark)' },
      { keyDesc: ['T'], description: 'Cycle color theme (Sage → Lotus → Oasis)' },
    ],
  },
  {
    title: 'Sidebar & Layout',
    shortcuts: [
      { keyDesc: ['\\'], description: 'Toggle collapse / expand sidebar' },
      { keyDesc: ['C'], description: 'Open Playwright config generator' },
    ],
  },
  {
    title: 'Navigation',
    shortcuts: [
      { keyDesc: ['1', '…', '8'], description: 'Jump directly to navigation tab by index' },
      { keyDesc: ['['], description: 'Switch to previous tab' },
      { keyDesc: [']'], description: 'Switch to next tab' },
      { keyDesc: ['P', '←'], description: 'Go to previous page in table / modal' },
      { keyDesc: ['N', '→'], description: 'Go to next page in table / modal' },
      { keyDesc: ['R'], description: 'Return to top of page' },
      { keyDesc: ['Z'], description: 'Open Zen Reporter documentation website' },
    ],
  },
  {
    title: 'Search & Quick Actions',
    shortcuts: [
      { keyDesc: ['/'], description: 'Open test run switcher' },
      {
        keyDesc: ['1', '…', '5'],
        description: 'Select run on current view (when Switch Run menu or modal is open)',
      },
      { keyDesc: ['L'], description: 'Jump to latest run (when Switch Run menu or modal is open)' },
      { keyDesc: ['X'], description: 'Expand all (Suites & Failures tabs)' },
      { keyDesc: ['S'], description: 'Collapse all (Suites & Failures tabs)' },
      { keyDesc: ['F'], description: 'Focus contextual search / filter input' },
      { keyDesc: ['G'], description: 'Copy Git commit SHA' },
      { keyDesc: ['B'], description: 'Copy Git branch name' },
      { keyDesc: ['?'], description: 'Show keyboard shortcuts cheatsheet' },
      { keyDesc: ['Esc'], description: 'Close any open modal or dialog' },
    ],
  },
];

/**
 * Cheatsheet modal listing all available keyboard shortcuts grouped by category.
 *
 * @param props - Component properties.
 * @param props.isOpen - Whether the shortcuts modal is open.
 * @param props.onClose - Callback triggered when the modal is closed.
 * @returns The rendered shortcuts modal component.
 */
export function ShortcutsModal({ isOpen, onClose }: ShortcutsModalProps) {
  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2">
          <svg
            className="h-5 w-5 text-accent-blue"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.75}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M6.75 7.5h10.5m-10.5 4.5h10.5m-10.5 4.5h6M3.75 4.5A2.25 2.25 0 001.5 6.75v10.5A2.25 2.25 0 003.75 19.5h16.5A2.25 2.25 0 0022.5 17.25V6.75A2.25 2.25 0 0020.25 4.5H3.75z"
            />
          </svg>
          <span>Keyboard Shortcuts</span>
        </div>
      }
      subtitle="Press any of the single-key shortcuts from anywhere outside text inputs"
      maxWidthClass="max-w-3xl"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-1">
        {SHORTCUT_SECTIONS.map((section) => (
          <div key={section.title} className="space-y-1.5">
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-text-muted">
              {section.title}
            </h4>
            <div className="divide-y divide-border-default/60 rounded-lg border border-border-default bg-surface-100/50 dark:bg-surface-100/30">
              {section.shortcuts.map((item) => (
                <div
                  key={item.description}
                  className="flex items-center justify-between px-3 py-2 text-xs text-text-ink dark:text-text-on-primary"
                >
                  <span className="font-medium text-text-body-mid dark:text-text-on-primary text-[11.5px] leading-snug">
                    {item.description}
                  </span>
                  <div className="flex items-center gap-1 shrink-0 ml-3">
                    {item.keyDesc.map((k) => (
                      <Kbd key={k} size="md">
                        {k}
                      </Kbd>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </BaseModal>
  );
}
