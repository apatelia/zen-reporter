import BaseModal from '@/components/shared/BaseModal';

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
      { keyDesc: ['d'], description: 'Cycle dark mode (System → Light → Dark)' },
      { keyDesc: ['t'], description: 'Cycle color theme (Sage → Lotus → Oasis)' },
    ],
  },
  {
    title: 'Sidebar & Layout',
    shortcuts: [
      { keyDesc: ['\\'], description: 'Toggle collapse / expand sidebar' },
      { keyDesc: ['c'], description: 'Open Playwright config generator' },
    ],
  },
  {
    title: 'Navigation',
    shortcuts: [
      { keyDesc: ['1', '…', '8'], description: 'Jump directly to navigation tab by index' },
      { keyDesc: ['['], description: 'Switch to previous tab' },
      { keyDesc: [']'], description: 'Switch to next tab' },
      { keyDesc: ['p'], description: 'Go to previous page in table / modal' },
      { keyDesc: ['n'], description: 'Go to next page in table / modal' },
      { keyDesc: ['r'], description: 'Return to top of page' },
      { keyDesc: ['z'], description: 'Open Zen Reporter documentation website' },
    ],
  },
  {
    title: 'Search & Quick Actions',
    shortcuts: [
      { keyDesc: ['/'], description: 'Open test run switcher' },
      { keyDesc: ['f'], description: 'Focus contextual search / filter input' },
      { keyDesc: ['g'], description: 'Copy Git commit SHA' },
      { keyDesc: ['b'], description: 'Copy Git branch name' },
      { keyDesc: ['?'], description: 'Show keyboard shortcuts cheatsheet' },
      { keyDesc: ['Esc'], description: 'Close any open modal or dialog' },
    ],
  },
];

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
                      <kbd
                        key={k}
                        className="inline-flex min-w-5 h-5 items-center justify-center px-1.5 rounded border border-border-default bg-surface-50 text-[11px] font-mono font-semibold text-text-ink shadow-2xs dark:bg-surface-200 dark:text-text-on-primary"
                      >
                        {k}
                      </kbd>
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
