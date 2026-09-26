import logoRaw from '@/assets/logo.svg?raw';
import Overview from '@/components/dashboard/Overview';
import FailuresSection from '@/components/failures/FailuresSection';
import SuitesSection from '@/components/suites/SuitesSection';
import FilesSection from '@/components/files/FilesSection';
import ProjectsSection from '@/components/projects/ProjectsSection';
import InsightsSection from '@/components/insights/InsightsSection';
import TrendsSection from '@/components/trends/TrendsSection';
import HistorySection from '@/components/history/HistorySection';
import Sidebar, { type TabKey } from '@/components/layout/Sidebar';
import type { HistoryData, ReportData, TestRun, TestSuite } from '@/lib/types';
import { formatDateRange, formatDuration } from '@/lib/utils';
import { useEffect, useMemo, useState } from 'react';

const logo = `data:image/svg+xml;utf8,${encodeURIComponent(logoRaw)}`;

export default function App() {
  const isSummaryView = useMemo(() => {
    if (typeof window === 'undefined') return false;
    const params = new URLSearchParams(window.location.search);
    return (
      params.get('view') === 'summary' ||
      Boolean((window as unknown as { __ZEN_SUMMARY_ONLY__?: boolean }).__ZEN_SUMMARY_ONLY__)
    );
  }, []);

  const [activeTabState, setActiveTabState] = useState<TabKey>('overview');
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [historyData, setHistoryData] = useState<HistoryData | null>(null);
  const [isCollapsed, setIsCollapsed] = useState(false);

  const initialReportData = useMemo(() => {
    if (typeof document === 'undefined') return null;
    const inlineEl = document.getElementById('report-data');
    if (inlineEl) {
      const text = inlineEl.textContent?.trim();
      if (text) {
        try {
          return JSON.parse(text) as ReportData;
        } catch {
          return null;
        }
      }
    }
    return null;
  }, []);

  const [theme, setTheme] = useState<'cafe' | 'concept' | 'sentinel'>(() => {
    const testRun = initialReportData?.testRun as
      (TestRun & { theme?: string; darkMode?: boolean }) | undefined;
    const configuredTheme = testRun?.theme;
    if (configuredTheme) {
      const lower = configuredTheme.toLowerCase();
      if (lower === 'cafe' || lower === 'concept' || lower === 'sentinel') {
        return lower;
      }
    }
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('zen-theme');
      if (saved === 'cafe' || saved === 'concept' || saved === 'sentinel') {
        return saved;
      }
    }
    return 'cafe';
  });

  const [darkMode, setDarkMode] = useState<'light' | 'dark'>(() => {
    const testRun = initialReportData?.testRun as
      (TestRun & { theme?: string; darkMode?: boolean }) | undefined;
    if (testRun?.darkMode !== undefined) {
      return testRun.darkMode ? 'dark' : 'light';
    }
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('zen-dark-mode');
      if (saved === 'dark' || saved === 'light') {
        return saved;
      }
    }
    return 'light';
  });

  const applyThemeAndDarkMode = (data: ReportData) => {
    const testRun = data?.testRun as (TestRun & { theme?: string; darkMode?: boolean }) | undefined;
    if (testRun) {
      if (testRun.theme) {
        const lower = testRun.theme.toLowerCase();
        if (lower === 'cafe' || lower === 'concept' || lower === 'sentinel') {
          setTheme(lower as 'cafe' | 'concept' | 'sentinel');
        }
      }
      if (testRun.darkMode !== undefined) {
        setDarkMode(testRun.darkMode ? 'dark' : 'light');
      }
    }
  };

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('zen-theme', theme);
  }, [theme]);

  useEffect(() => {
    if (darkMode === 'dark') {
      document.documentElement.classList.add('dark');
      document.documentElement.style.colorScheme = 'dark';
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.style.colorScheme = 'light';
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
    void (async () => {
      async function loadReportData() {
        // First check for embedded inline report data (used in static single-file HTML reports)
        const inlineEl = document.getElementById('report-data');
        if (inlineEl) {
          const text = inlineEl.textContent?.trim();
          if (text) {
            try {
              const data = JSON.parse(text);
              setReportData(data);
              applyThemeAndDarkMode(data);
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
            applyThemeAndDarkMode(data);
            return;
          }
        }
      }

      const loadHistory = async () => {
        const inlineEl = document.getElementById('history-data');
        if (inlineEl) {
          const text = inlineEl.textContent?.trim();
          if (text) {
            try {
              setHistoryData(JSON.parse(text));
              return;
            } catch {
              /* fall through to fetch */
            }
          }
        }
        if (typeof window !== 'undefined' && window.location.protocol !== 'file:') {
          const resp = await fetch('./history.json');
          if (resp.ok) setHistoryData(await resp.json());
        }
      };

      try {
        await Promise.all([loadReportData(), loadHistory()]);
      } catch (err) {
        console.warn('Could not load report data:', err);
      } finally {
        setIsLoading(false);
      }
    })();
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

  const isHistoryDisabled = useMemo(() => {
    return reportData?.testRun?.enableHistory === false;
  }, [reportData]);

  const isMinimalReport = useMemo(() => {
    return Boolean(reportData?.testRun?.minimalReport);
  }, [reportData]);

  const activeTab = useMemo(() => {
    if (
      isMinimalReport &&
      (activeTabState === 'projects' ||
        activeTabState === 'history' ||
        activeTabState === 'trends' ||
        activeTabState === 'insights')
    ) {
      return 'overview';
    }
    return activeTabState;
  }, [isMinimalReport, activeTabState]);

  /** Single root element for the app layout */
  return (
    <div className="flex h-screen overflow-hidden bg-canvas">
      {/* Sidebar - hidden in summary view */}
      {!isSummaryView && (
        <Sidebar
          activeTab={activeTab}
          setActiveTab={setActiveTabState}
          isCollapsed={isCollapsed}
          setIsCollapsed={setIsCollapsed}
          failedCount={failedCount}
          timedOutCount={timedOutCount}
          interruptedCount={interruptedCount}
          isHistoryDisabled={isHistoryDisabled}
          isMinimalReport={isMinimalReport}
        />
      )}

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden bg-canvas">
        {/* Top Bar with Project/Run Name & Theme Switch */}
        <header className="border-b border-border-default bg-surface-50/50 px-6 py-3 shrink-0 flex items-start justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="min-w-0 flex flex-col justify-center">
              <h1 className="text-base font-bold tracking-tight text-text-ink dark:text-text-on-primary sm:text-lg truncate leading-tight">
                {projectName || 'Test Execution Report'}
              </h1>
              <div className="mt-1 flex items-center gap-2 flex-wrap text-xs text-text-body-mid dark:text-text-muted min-w-0">
                <span className="text-text-muted font-normal">Report for</span>
                <span className="inline-flex items-center rounded-md bg-accent-blue/10 px-2 py-0.5 text-xs font-semibold text-accent-blue ring-1 ring-inset ring-accent-blue/20 dark:bg-accent-blue/20 dark:text-accent-blue max-w-sm truncate">
                  {testRunName || 'Playwright Test Reporter'}
                </span>
                <span className="text-text-muted-soft text-[10px]">•</span>
                <span className="inline-flex items-center gap-1 text-[11px] text-text-muted">
                  <span>
                    Powered by{' '}
                    <a
                      href="https://apatelia.github.io/zen-reporter-website/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-0.5 font-semibold text-accent-blue dark:text-accent-blue hover:underline"
                    >
                      <img
                        src={logo}
                        alt="Zen Reporter"
                        className="h-3 w-3 shrink-0 object-contain opacity-80"
                      />
                      Zen Reporter
                      <svg
                        className="h-2.5 w-2.5 shrink-0 opacity-70"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M13.5 6H18m0 0v4.5m0-4.5L11.25 12.75M18 10.5v8.25a1.5 1.5 0 01-1.5 1.5H5.25A1.5 1.5 0 013.75 18.75V7.5a1.5 1.5 0 011.5-1.5h8.25"
                        />
                      </svg>
                    </a>
                  </span>
                </span>
              </div>
              {summary && (
                <div className="mt-1.5 hidden sm:flex items-center gap-2 text-xs text-text-body-mid dark:text-text-muted">
                  <div className="flex items-center gap-1.5">
                    <svg
                      className="h-3.5 w-3.5 text-text-muted shrink-0"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={1.75}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
                      <line x1="16" x2="16" y1="2" y2="6" />
                      <line x1="8" x2="8" y1="2" y2="6" />
                      <line x1="3" x2="21" y1="10" y2="10" />
                    </svg>
                    <span className="font-medium">
                      {formatDateRange(summary.startTime, summary.endTime)}
                    </span>
                  </div>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-surface-100 px-2 py-0.5 text-[11px] font-semibold text-text-body-mid border border-border-default dark:bg-surface-100/60 dark:text-text-muted">
                    <svg
                      className="h-3 w-3 text-text-body-mid dark:text-text-muted shrink-0"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <circle cx="12" cy="12" r="9" />
                      <polyline points="12 6 12 12 16 14" />
                    </svg>
                    <span>{formatDuration(summary.duration)}</span>
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0 pt-0.5">
            <div className="flex items-center gap-2">
              <label
                htmlFor="theme-select"
                className="text-xs text-text-body-mid dark:text-text-muted shrink-0 font-medium"
              >
                Theme:
              </label>
              <div className="relative inline-flex items-center">
                <select
                  id="theme-select"
                  value={theme}
                  onChange={(e) => setTheme(e.target.value as 'cafe' | 'concept' | 'sentinel')}
                  className="appearance-none rounded-md border border-border-default bg-surface-50 pl-3 pr-8 py-1.5 text-xs text-text-ink focus:border-accent-blue focus:outline-none dark:bg-surface-50 dark:text-text-on-primary font-medium cursor-pointer"
                  aria-label="Select Theme"
                  title="Select Theme"
                >
                  <option value="cafe">Cafe</option>
                  <option value="concept">Concept</option>
                  <option value="sentinel">Sentinel</option>
                </select>
                <svg
                  className="pointer-events-none absolute right-2.5 h-3.5 w-3.5 text-text-body-mid dark:text-text-muted shrink-0"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M19.5 8.25l-7.5 7.5-7.5-7.5"
                  />
                </svg>
              </div>
            </div>

            <button
              onClick={cycleDarkMode}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md border border-border-default text-text-body-mid hover:text-text-ink hover:bg-surface-100 dark:text-text-muted dark:hover:text-text-on-primary transition-colors shrink-0 cursor-pointer text-xs font-medium"
              title={`Switch to ${darkMode === 'dark' ? 'Light' : 'Dark'} mode`}
            >
              {darkMode === 'dark' ? (
                <>
                  <svg
                    className="h-4 w-4 text-warning-400"
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
                  <span className="hidden sm:inline">Light Mode</span>
                </>
              ) : (
                <>
                  <svg
                    className="h-4 w-4 text-primary-500"
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
                  <span className="hidden sm:inline">Dark Mode</span>
                </>
              )}
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-auto">
          <div className="mx-auto max-w-full px-6 sm:px-8 pt-4 pb-8">
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
              <Overview summary={summary} suites={suites} isMinimalReport={isMinimalReport} />
            )}

            {!isLoading &&
              !isSummaryView &&
              !isMinimalReport &&
              reportData &&
              activeTab === 'projects' && <ProjectsSection suites={suites} />}

            {!isLoading && !isSummaryView && reportData && activeTab === 'suites' && (
              <SuitesSection suites={suites} />
            )}

            {!isLoading && !isSummaryView && reportData && activeTab === 'files' && (
              <FilesSection suites={suites} isMinimalReport={isMinimalReport} />
            )}

            {!isLoading && !isSummaryView && reportData && activeTab === 'failures' && (
              <FailuresSection
                suites={suites}
                failedCount={failedCount}
                timedOutCount={timedOutCount}
                interruptedCount={interruptedCount}
              />
            )}

            {!isLoading && !isSummaryView && !isMinimalReport && activeTab === 'trends' && (
              <TrendsSection
                history={historyData}
                suites={suites}
                isHistoryDisabled={isHistoryDisabled}
              />
            )}

            {!isLoading && !isSummaryView && !isMinimalReport && activeTab === 'insights' && (
              <InsightsSection
                history={historyData}
                suites={suites}
                isHistoryDisabled={isHistoryDisabled}
              />
            )}

            {!isLoading && !isSummaryView && !isMinimalReport && activeTab === 'history' && (
              <HistorySection history={historyData} isHistoryDisabled={isHistoryDisabled} />
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
