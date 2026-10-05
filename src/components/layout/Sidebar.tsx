import logoRaw from '@/assets/logo.svg?raw';
import logoDarkRaw from '@/assets/logo-dark.svg?raw';
import pkg from '../../../package.json';

const logo = `data:image/svg+xml;utf8,${encodeURIComponent(logoRaw)}`;
const logoDark = `data:image/svg+xml;utf8,${encodeURIComponent(logoDarkRaw)}`;

export type TabKey =
  'overview' | 'projects' | 'suites' | 'files' | 'failures' | 'history' | 'trends' | 'insights';

const TABS: { key: TabKey; label: string; icon: React.ReactNode }[] = [
  {
    key: 'overview',
    label: 'Overview',
    icon: (
      <svg
        className="h-5 w-5"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.5}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z"
        />
      </svg>
    ),
  },
  {
    key: 'projects',
    label: 'Projects',
    icon: (
      <svg
        className="h-5 w-5"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.5}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M3.75 4.5h16.5m-16.5 3.75h16.5"
        />
      </svg>
    ),
  },
  {
    key: 'suites',
    label: 'Suites',
    icon: (
      <svg
        className="h-5 w-5"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.5}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z"
        />
      </svg>
    ),
  },
  {
    key: 'files',
    label: 'Files',
    icon: (
      <svg
        className="h-5 w-5"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.5}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
        />
      </svg>
    ),
  },
  {
    key: 'failures',
    label: 'Failures',
    icon: (
      <svg
        className="h-5 w-5"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.5}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
        />
      </svg>
    ),
  },
  {
    key: 'history',
    label: 'History',
    icon: (
      <svg
        className="h-5 w-5"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.5}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
    ),
  },
  {
    key: 'insights',
    label: 'Insights',
    icon: (
      <svg
        className="h-5 w-5"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.5}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z"
        />
      </svg>
    ),
  },
  {
    key: 'trends',
    label: 'Trends',
    icon: (
      <svg
        className="h-5 w-5"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.5}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M2.25 18L9 11.25l4.306 4.307a.5.5 0 00.71 0l7.234-7.234M21 8.25V12M21 8.25H17.25"
        />
      </svg>
    ),
  },
];

function SidebarItem({
  icon,
  label,
  isActive,
  onClick,
  badge,
  disabledBadge,
  isCollapsed,
}: {
  icon: React.ReactNode;
  label: string;
  isActive: boolean;
  onClick: () => void;
  badge?: number;
  disabledBadge?: boolean;
  isCollapsed?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      title={
        isCollapsed ? (disabledBadge ? `${label} (History recording disabled)` : label) : undefined
      }
      className={`group relative flex w-full items-center ${
        isCollapsed ? 'justify-center px-2 py-2.5' : 'gap-3 px-3 py-2.5'
      } rounded-md text-sm font-semibold transition-all duration-150 ${
        isActive
          ? 'bg-accent-blue/15 text-accent-blue shadow-sm dark:bg-accent-blue/25 dark:text-accent-blue'
          : 'text-text-body-mid hover:bg-surface-100 hover:text-text-ink dark:text-text-body-mid dark:hover:bg-surface-100 dark:hover:text-text-on-primary font-medium'
      }`}
    >
      {isActive && (
        <span className="absolute left-0 top-1.5 bottom-1.5 w-1 rounded-r-full bg-accent-blue dark:bg-accent-blue" />
      )}
      <span
        className={`shrink-0 transition-colors ${
          isActive
            ? 'text-accent-blue dark:text-accent-blue'
            : 'text-text-body-mid group-hover:text-text-ink dark:text-text-body-mid dark:group-hover:text-text-on-primary'
        }`}
      >
        {icon}
      </span>
      {!isCollapsed && <span className="truncate">{label}</span>}
      {badge !== undefined && badge > 0 && (
        <span
          className={
            isCollapsed
              ? 'absolute top-1.5 right-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger-500 px-1 text-[10px] font-bold text-white dark:text-surface-950 shadow-xs'
              : 'ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-danger-500 px-1.5 text-[11px] font-bold text-white dark:text-surface-950 shadow-xs'
          }
        >
          {badge}
        </span>
      )}
      {disabledBadge && (
        <span
          title="History recording disabled"
          className={
            isCollapsed
              ? 'absolute top-1.5 right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-amber-500 text-white dark:text-surface-950 shadow-xs'
              : 'ml-auto flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold text-amber-700 dark:text-amber-300 border border-amber-500/30'
          }
        >
          {isCollapsed ? (
            '!'
          ) : (
            <>
              <svg
                className="h-3 w-3 shrink-0"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
                />
              </svg>
              <span>Disabled</span>
            </>
          )}
        </span>
      )}
    </button>
  );
}

interface SidebarProps {
  activeTab: TabKey;
  setActiveTab: (tab: TabKey) => void;
  isCollapsed: boolean;
  setIsCollapsed: (collapsed: boolean) => void;
  failedCount: number;
  timedOutCount: number;
  interruptedCount: number;
  isHistoryDisabled: boolean;
  isMinimalReport?: boolean;
}

export default function Sidebar({
  activeTab,
  setActiveTab,
  isCollapsed,
  setIsCollapsed,
  failedCount,
  timedOutCount,
  interruptedCount,
  isHistoryDisabled,
  isMinimalReport,
}: SidebarProps) {
  const visibleTabs = isMinimalReport
    ? TABS.filter(
        (t) =>
          t.key !== 'projects' && t.key !== 'history' && t.key !== 'trends' && t.key !== 'insights'
      )
    : TABS;

  return (
    <aside
      className={`flex flex-col border-r border-border-default bg-surface-50 transition-all duration-200 ${
        isCollapsed ? 'w-16 min-w-16 shrink-0' : 'w-52 min-w-52 shrink-0'
      }`}
    >
      {/* Sidebar Header & Collapse Toggle */}
      <div
        className={`flex items-center ${
          isCollapsed ? 'flex-col gap-3 py-3' : 'justify-between min-w-0 px-4 py-3.5'
        }`}
      >
        {!isCollapsed ? (
          <>
            <a
              href="https://zen-reporter.vercel.app"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2.5 min-w-0 group cursor-pointer"
              title={`Zen Reporter v${pkg.version}`}
            >
              <img
                src={logo}
                alt="Zen Reporter"
                className="h-7 w-7 shrink-0 object-contain drop-shadow-xs transition-transform group-hover:scale-105 dark:hidden"
              />
              <img
                src={logoDark}
                alt="Zen Reporter"
                className="h-7 w-7 shrink-0 object-contain drop-shadow-xs transition-transform group-hover:scale-105 hidden dark:block"
              />
              <div className="flex flex-col min-w-0">
                <span className="inline-flex items-center gap-1 text-sm font-bold tracking-tight text-accent-blue dark:text-accent-blue group-hover:underline truncate leading-tight transition-colors">
                  Zen Reporter
                  <svg
                    className="h-3 w-3 shrink-0 text-text-muted group-hover:opacity-100 transition-opacity"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                    <polyline points="15 3 21 3 21 9" />
                    <line x1="10" y1="14" x2="21" y2="3" />
                  </svg>
                </span>
                <span className="text-[10px] font-medium text-text-muted truncate leading-tight">
                  v{pkg.version}
                </span>
              </div>
            </a>
            <button
              onClick={() => setIsCollapsed(true)}
              className="p-1.5 rounded-md text-text-body-mid hover:text-text-ink hover:bg-surface-100 transition-colors shrink-0"
              title="Collapse sidebar"
            >
              <svg
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15.75 19.5L8.25 12l7.5-7.5"
                />
              </svg>
            </button>
          </>
        ) : (
          <>
            <a
              href="https://zen-reporter.vercel.app"
              target="_blank"
              rel="noopener noreferrer"
              className="p-1 rounded-md hover:bg-surface-100 transition-colors block shrink-0"
              title={`Zen Reporter v${pkg.version}`}
            >
              <img
                src={logo}
                alt="Zen Reporter"
                className="h-7 w-7 object-contain drop-shadow-xs dark:hidden"
              />
              <img
                src={logoDark}
                alt="Zen Reporter"
                className="h-7 w-7 object-contain drop-shadow-xs hidden dark:block"
              />
            </a>
            <button
              onClick={() => setIsCollapsed(false)}
              className="p-1.5 rounded-md text-text-body-mid hover:text-text-ink hover:bg-surface-100 transition-colors"
              title="Expand sidebar"
            >
              <svg
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
              </svg>
            </button>
          </>
        )}
      </div>
      <div className="mx-3 h-px bg-border-default"></div>

      {/* Nav */}
      <nav className={`flex-1 space-y-1 ${isCollapsed ? 'px-2' : 'px-3'} py-2`}>
        {visibleTabs.map((tab) => (
          <SidebarItem
            key={tab.key}
            icon={tab.icon}
            label={tab.label}
            isActive={activeTab === tab.key}
            onClick={() => setActiveTab(tab.key)}
            badge={
              tab.key === 'failures' ? failedCount + timedOutCount + interruptedCount : undefined
            }
            disabledBadge={
              isHistoryDisabled &&
              (tab.key === 'history' || tab.key === 'trends' || tab.key === 'insights')
            }
            isCollapsed={isCollapsed}
          />
        ))}
      </nav>
    </aside>
  );
}
