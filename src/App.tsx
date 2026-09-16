import Overview from '@/components/dashboard/Overview';
import FailuresSection from '@/components/failures/FailuresSection';
import SuitesSection from '@/components/suites/SuitesSection';
import type { ReportData, TestSuite } from '@/lib/types';
import { extractFailedTests } from '@/lib/utils';
import { useEffect, useMemo, useState } from 'react';
import logoRaw from '@/assets/logo.svg?raw';

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
}: {
  icon: React.ReactNode;
  label: string;
  isActive: boolean;
  onClick: () => void;
  badge?: number;
}) {
  return (
    <button
      onClick={onClick}
      className={`group relative flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm font-semibold transition-all duration-150 ${
        isActive
          ? 'bg-accent-blue/10 text-accent-blue shadow-sm dark:bg-accent-blue/20 dark:text-success-500'
          : 'text-text-body-mid hover:bg-surface-100 hover:text-text-ink dark:text-text-body-mid dark:hover:bg-surface-100 dark:hover:text-text-on-primary font-medium'
      }`}
    >
      {isActive && (
        <span className="absolute left-0 top-1.5 bottom-1.5 w-1 rounded-r-full bg-accent-blue dark:bg-success-500" />
      )}
      <span
        className={`shrink-0 transition-colors ${isActive ? 'text-accent-blue dark:text-success-500' : 'text-text-body-mid group-hover:text-text-ink dark:text-text-body-mid dark:group-hover:text-text-on-primary'}`}
      >
        {icon}
      </span>
      <span className="truncate">{label}</span>
      {badge !== undefined && badge > 0 && (
        <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-accent-red px-1.5 text-[11px] font-semibold text-text-on-primary">
          {badge}
        </span>
      )}
    </button>
  );
}

export default function App() {
  const [activeTab, setActiveTab] = useState<TabKey>('overview');
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [darkMode, setDarkMode] = useState<'light' | 'dark'>(
    ((typeof window !== 'undefined' &&
      (localStorage.getItem('zen-dark-mode') as 'light' | 'dark' | null)) ||
      'light') as 'light' | 'dark'
  );

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
        const resp = await fetch('/zen-report/report.json');
        if (!resp.ok) {
          throw new Error('No report found');
        }
        const data = await resp.json();
        setReportData(data);
      } catch {
        const inlineEl = document.getElementById('report-data');
        if (inlineEl) {
          try {
            const data = JSON.parse(inlineEl.textContent || '{}');
            setReportData(data);
          } catch {
            // ignore
          }
        }
      } finally {
        setIsLoading(false);
      }
    }
    loadReport();
  }, []);

  const { summary, suites } = useMemo(() => {
    if (!reportData?.testRun) return { summary: null, suites: [] as TestSuite[] };
    return {
      summary: reportData.testRun.summary,
      suites: reportData.testRun.suites,
    };
  }, [reportData]);

  const failedCount = summary ? summary.failed : 0;
  const timedOutCount = summary ? summary.timedOut : 0;
  const interruptedCount = summary ? summary.interrupted || 0 : 0;

  /** Single root element for the app layout */
  return (
    <div className="flex h-screen overflow-hidden bg-canvas">
      {/* Sidebar */}
      <aside className="flex w-60 flex-col border-r border-border-default bg-surface-50">
        {/* Brand */}
        <div className="flex items-center gap-3 px-5 py-5">
          <img src={logo} alt="Zen Reporter" className="h-9 w-9 object-contain drop-shadow-xs" />
          <div>
            <h1 className="text-sm font-bold tracking-tight text-text-ink">Zen Reporter</h1>
            <p className="text-[11px] text-text-body-mid">Playwright Test Results</p>
          </div>
        </div>
        <div className="mx-3 h-px bg-border-default"></div>
        <div className="flex justify-end px-3 py-2">
          <button
            onClick={cycleDarkMode}
            className={`relative flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue focus-visible:ring-offset-2 focus-visible:ring-offset-surface-50 ${darkMode === 'dark' ? 'bg-accent-blue' : 'bg-surface-200'}`}
            title={`Switch to ${darkMode === 'dark' ? 'Light' : 'Dark'} mode`}
          >
            <span
              className="pointer-events-none flex h-5 w-5 transform items-center justify-center rounded-full bg-canvas shadow-sm transition-transform duration-200"
              style={{
                transform: darkMode === 'dark' ? 'translateX(20px)' : 'translateX(1px)',
              }}
            >
              {darkMode === 'light' ? (
                <svg
                  className="h-3 w-3 text-text-muted"
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
                  className="h-3 w-3 text-text-muted"
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

        {/* Nav */}
        <nav className="flex-1 space-y-1 px-3 py-2">
          {TABS.map((tab) => (
            <SidebarItem
              key={tab.key}
              icon={tab.icon}
              label={tab.label}
              isActive={activeTab === tab.key}
              onClick={() => setActiveTab(tab.key)}
              badge={
                tab.key === 'failures' ? failedCount + timedOutCount + interruptedCount : undefined
              }
            />
          ))}
        </nav>
        <div className="mx-3 h-px bg-border-default"></div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <div className="mx-auto max-w-full bg-canvas px-10 py-8">
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

          {!isLoading && reportData && activeTab === 'overview' && summary && (
            <Overview summary={summary} suites={suites} />
          )}

          {!isLoading && reportData && activeTab === 'suites' && suites.length > 0 && (
            <SuitesSection suites={suites} />
          )}

          {!isLoading && reportData && activeTab === 'suites' && suites.length === 0 && (
            <div className="flex items-center justify-center py-24 text-center">
              <div>
                <h3 className="text-base font-semibold text-text-ink">No suites</h3>
                <p className="mt-1 text-sm text-text-body-mid">No test suites to display.</p>
              </div>
            </div>
          )}

          {!isLoading && reportData && activeTab === 'failures' && (
            <FailuresSection
              suites={suites}
              failedCount={failedCount}
              timedOutCount={timedOutCount}
              interruptedCount={interruptedCount}
            />
          )}
        </div>
      </main>
    </div>
  );
}
