import logoRaw from '@/assets/logo.svg?raw';
import Overview from '@/components/dashboard/Overview';
import FailuresSection from '@/components/failures/FailuresSection';
import SuitesSection from '@/components/suites/SuitesSection';
import type { ReportData, TestSuite } from '@/lib/types';
import { useEffect, useMemo, useState } from 'react';

const logo = `data:image/svg+xml;utf8,${encodeURIComponent(logoRaw)}`;

type TabKey = 'overview' | 'suites' | 'failures';

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
];

function SidebarItem({
  icon,
  label,
  isActive,
  onClick,
  badge,
  isCollapsed,
}: {
  icon: React.ReactNode;
  label: string;
  isActive: boolean;
  onClick: () => void;
  badge?: number;
  isCollapsed?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      title={isCollapsed ? label : undefined}
      className={`group relative flex w-full items-center ${
        isCollapsed ? 'justify-center px-2 py-2.5' : 'gap-3 px-3 py-2.5'
      } rounded-md text-sm font-semibold transition-all duration-150 ${
        isActive
          ? 'bg-accent-blue/10 text-accent-blue shadow-sm dark:bg-accent-blue/20 dark:text-success-500'
          : 'text-text-body-mid hover:bg-surface-100 hover:text-text-ink dark:text-text-body-mid dark:hover:bg-surface-100 dark:hover:text-text-on-primary font-medium'
      }`}
    >
      {isActive && (
        <span className="absolute left-0 top-1.5 bottom-1.5 w-1 rounded-r-full bg-accent-blue dark:bg-success-500" />
      )}
      <span
        className={`shrink-0 transition-colors ${
          isActive
            ? 'text-accent-blue dark:text-success-500'
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
              ? 'absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent-red px-1 text-[10px] font-bold text-text-on-primary shadow-sm'
              : 'ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-accent-red px-1.5 text-[11px] font-semibold text-text-on-primary'
          }
        >
          {badge}
        </span>
      )}
    </button>
  );
}

export default function App() {
  const isSummaryView = useMemo(() => {
    if (typeof window === 'undefined') return false;
    const params = new URLSearchParams(window.location.search);
    return (
      params.get('view') === 'summary' ||
      Boolean((window as unknown as { __ZEN_SUMMARY_ONLY__?: boolean }).__ZEN_SUMMARY_ONLY__)
    );
  }, []);

  const [activeTab, setActiveTab] = useState<TabKey>('overview');
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [darkMode, setDarkMode] = useState<'light' | 'dark'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('zen-dark-mode');
      if (saved === 'dark' || saved === 'light') {
        return saved;
      }
    }
    return 'light';
  });

  useEffect(() => {
    if (darkMode === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }

    let link = document.querySelector<HTMLLinkElement>("link[rel~='icon']");
    if (!link) {
      link = document.createElement('link');
      link.rel = 'icon';
      document.head.appendChild(link);
    }
    link.type = 'image/svg+xml';
    link.href = logo;
  }, [darkMode]);

  const cycleDarkMode = () => {
    const next = darkMode === 'light' ? 'dark' : 'light';
    setDarkMode(next);
    localStorage.setItem('zen-dark-mode', next);
  };

  useEffect(() => {
    async function loadReport() {
      try {
        // First check for embedded inline report data (used in static single-file HTML reports)
        const inlineEl = document.getElementById('report-data');
        if (inlineEl) {
          const text = inlineEl.textContent?.trim();
          if (text) {
            try {
              const data = JSON.parse(text);
              setReportData(data);
              return;
            } catch {
              // ignore parse errors and proceed
            }
          }
        }

        // Only attempt fetching if not running under file:// protocol (e.g., local dev server)
        if (typeof window !== 'undefined' && window.location.protocol !== 'file:') {
          const resp = await fetch('./report.json');
          if (resp.ok) {
            const data = await resp.json();
            setReportData(data);
            return;
          }
        }
      } catch (err) {
        console.warn('Could not load report data:', err);
      } finally {
        setIsLoading(false);
      }
    }
    loadReport();
  }, []);

  const { summary, suites, projectName, testRunName } = useMemo(() => {
    if (!reportData?.testRun)
      return {
        summary: null,
        suites: [] as TestSuite[],
        projectName: undefined,
        testRunName: undefined,
      };
    return {
      summary: reportData.testRun.summary,
      suites: reportData.testRun.suites,
      projectName: reportData.testRun.projectName,
      testRunName: reportData.testRun.testRunName,
    };
  }, [reportData]);

  const failedCount = summary ? summary.failed : 0;
  const timedOutCount = summary ? summary.timedOut : 0;
  const interruptedCount = summary ? summary.interrupted || 0 : 0;

  /** Single root element for the app layout */
  return (
    <div className="flex h-screen overflow-hidden bg-canvas">
      {/* Sidebar - hidden in summary view */}
      {!isSummaryView && (
        <aside
          className={`flex flex-col border-r border-border-default bg-surface-50 transition-all duration-200 ${
            isCollapsed ? 'w-16' : 'w-60'
          }`}
        >
          {/* Sidebar Header & Collapse Toggle */}
          <div
            className={`flex items-center ${
              isCollapsed ? 'justify-center py-4' : 'justify-between min-w-0 px-4 py-4'
            }`}
          >
            {!isCollapsed ? (
              <>
                <div className="flex items-center gap-2 min-w-0">
                  <svg
                    className="h-4 w-4 text-text-muted shrink-0"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={1.5}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M12 21a9 9 0 100-18 9 9 0 000 18z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M15.414 8.586l-2.828 5.657-5.657 2.828 2.828-5.657 5.657-2.828z"
                    />
                  </svg>
                  <span className="text-xs font-semibold tracking-wider text-text-muted uppercase truncate">
                    Navigation
                  </span>
                </div>
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
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M8.25 4.5l7.5 7.5-7.5 7.5"
                  />
                </svg>
              </button>
            )}
          </div>
          <div className="mx-3 h-px bg-border-default"></div>

          {/* Nav */}
          <nav className={`flex-1 space-y-1 ${isCollapsed ? 'px-2' : 'px-3'} py-2`}>
            {TABS.map((tab) => (
              <SidebarItem
                key={tab.key}
                icon={tab.icon}
                label={tab.label}
                isActive={activeTab === tab.key}
                onClick={() => setActiveTab(tab.key)}
                badge={
                  tab.key === 'failures'
                    ? failedCount + timedOutCount + interruptedCount
                    : undefined
                }
                isCollapsed={isCollapsed}
              />
            ))}
          </nav>
          <div className="mx-3 h-px bg-border-default"></div>

          {/* Brand & Theme Toggle at Bottom */}
          {!isCollapsed ? (
            <div className="flex items-center justify-between px-4 py-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <img
                  src={logo}
                  alt="Zen Reporter"
                  className="h-7 w-7 shrink-0 object-contain drop-shadow-xs"
                />
                <div className="min-w-0">
                  <h2 className="text-xs font-bold tracking-tight text-text-ink truncate">
                    Zen Reporter
                  </h2>
                  <p className="text-[10px] text-text-body-mid truncate">
                    Playwright Test Reporter
                  </p>
                </div>
              </div>
              <button
                onClick={cycleDarkMode}
                className={`relative flex h-5 w-9 shrink-0 items-center rounded-full transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue focus-visible:ring-offset-2 focus-visible:ring-offset-surface-50 ${
                  darkMode === 'dark' ? 'bg-accent-blue' : 'bg-surface-200'
                }`}
                title={`Switch to ${darkMode === 'dark' ? 'Light' : 'Dark'} mode`}
              >
                <span
                  className="pointer-events-none flex h-4 w-4 transform items-center justify-center rounded-full bg-canvas shadow-sm transition-transform duration-200"
                  style={{
                    transform: darkMode === 'dark' ? 'translateX(16px)' : 'translateX(1px)',
                  }}
                >
                  {darkMode === 'light' ? (
                    <svg
                      className="h-2.5 w-2.5 text-text-muted"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z"
                      />
                    </svg>
                  ) : (
                    <svg
                      className="h-2.5 w-2.5 text-text-muted"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z"
                      />
                    </svg>
                  )}
                </span>
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center px-2 py-3 gap-3">
              <button
                onClick={cycleDarkMode}
                className="flex h-9 w-9 items-center justify-center rounded-md text-text-body-mid hover:bg-surface-100 hover:text-text-ink transition-colors"
                title={`Switch to ${darkMode === 'dark' ? 'Light' : 'Dark'} mode`}
              >
                {darkMode === 'light' ? (
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
                      d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z"
                    />
                  </svg>
                ) : (
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
                      d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z"
                    />
                  </svg>
                )}
              </button>
            </div>
          )}
        </aside>
      )}

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden bg-canvas">
        {/* Top Bar for Project Name & Test Run Name */}
        {(projectName || testRunName || isSummaryView) && (
          <header className="border-b border-border-default bg-surface-50/50 px-10 py-5 shrink-0 flex items-center justify-between">
            {isSummaryView && <div className="w-9 shrink-0 hidden sm:block" />}
            <div className="flex flex-col min-w-0 flex-1 text-center">
              {projectName && (
                <h1
                  className="text-2xl font-bold tracking-tight text-text-ink dark:text-text-on-primary sm:text-3xl truncate"
                  title={projectName}
                >
                  {projectName}
                </h1>
              )}
              {testRunName && (
                <p
                  className="text-sm font-medium text-text-body-mid dark:text-text-muted sm:text-base truncate mt-1"
                  title={testRunName}
                >
                  {testRunName}
                </p>
              )}
            </div>
            {isSummaryView && (
              <button
                onClick={cycleDarkMode}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md border border-border-default text-text-body-mid hover:text-text-ink hover:bg-surface-100 dark:text-text-muted dark:hover:text-text-on-primary transition-colors shrink-0 ml-4 cursor-pointer text-xs font-medium"
                title={darkMode === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
              >
                {darkMode === 'dark' ? (
                  <>
                    <svg
                      className="h-4 w-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={1.5}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z"
                      />
                    </svg>
                    <span className="hidden sm:inline">Light</span>
                  </>
                ) : (
                  <>
                    <svg
                      className="h-4 w-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={1.5}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z"
                      />
                    </svg>
                    <span className="hidden sm:inline">Dark</span>
                  </>
                )}
              </button>
            )}
          </header>
        )}

        <div className="flex-1 overflow-auto">
          <div className="mx-auto max-w-full px-10 py-8">
            {isLoading && (
              <div className="flex items-center justify-center py-24">
                <div className="text-center">
                  <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-4 border-surface-200 border-t-accent-blue"></div>
                  <p className="text-sm text-text-body-mid">Loading report…</p>
                </div>
              </div>
            )}

            {!isLoading && !reportData && (
              <div className="flex items-center justify-center py-24 text-center">
                <div>
                  <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-md bg-surface-100">
                    <svg
                      className="h-8 w-8 text-text-body-mid"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={1.5}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
                      />
                    </svg>
                  </div>
                  <h3 className="text-base font-semibold text-text-ink">No report data</h3>
                  <p className="mt-1 text-sm text-text-body-mid">
                    Run your tests with the Zen Reporter to generate a report, or place a{' '}
                    <code className="rounded bg-surface-100 px-1 py-0.5 text-xs font-mono">
                      report/report.json
                    </code>{' '}
                    in the project.
                  </p>
                </div>
              </div>
            )}

            {!isLoading && reportData && (isSummaryView || activeTab === 'overview') && summary && (
              <Overview summary={summary} suites={suites} />
            )}

            {!isLoading && !isSummaryView && reportData && activeTab === 'suites' && (
              <SuitesSection suites={suites} />
            )}

            {!isLoading && !isSummaryView && reportData && activeTab === 'failures' && (
              <FailuresSection
                suites={suites}
                failedCount={failedCount}
                timedOutCount={timedOutCount}
                interruptedCount={interruptedCount}
              />
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
