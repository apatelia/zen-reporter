import faviconRaw from '@/assets/favicon.svg?raw';
import Overview from '@/components/dashboard/Overview';
import FailuresSection from '@/components/failures/FailuresSection';
import FilesSection from '@/components/files/FilesSection';
import HistorySection from '@/components/history/HistorySection';
import Sidebar, { type TabKey } from '@/components/layout/Sidebar';
import ThemeControls from '@/components/layout/ThemeControls';
import SuitesSection from '@/components/suites/SuitesSection';
import BackToTopButton from '@/components/shared/BackToTopButton';
import { formatDateRange, formatDuration } from '@/lib/formatters';
import type { HistoryData } from '@/lib/types/history';
import type { ReportData, TestRun, TestSuite } from '@/lib/types/report';
import { lazy, Suspense, useEffect, useMemo, useState } from 'react';

const ProjectsSection = lazy(() => import('@/components/projects/ProjectsSection'));
const TrendsSection = lazy(() => import('@/components/trends/TrendsSection'));
const InsightsSection = lazy(() => import('@/components/insights/InsightsSection'));

const faviconUri = `data:image/svg+xml;utf8,${encodeURIComponent(faviconRaw)}`;

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

  const [darkMode, setDarkMode] = useState<'system' | 'light' | 'dark'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('zen-dark-mode');
      if (saved === 'dark' || saved === 'light' || saved === 'system') {
        return saved;
      }
    }

    const testRun = initialReportData?.testRun as
      (TestRun & { theme?: string; darkMode?: boolean }) | undefined;

    if (testRun?.darkMode !== undefined) {
      return testRun.darkMode ? 'dark' : 'light';
    }

    return 'system';
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
      if (
        testRun.darkMode !== undefined &&
        typeof window !== 'undefined' &&
        !localStorage.getItem('zen-dark-mode')
      ) {
        setDarkMode(testRun.darkMode ? 'dark' : 'light');
      }
    }
  };

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('zen-theme', theme);
  }, [theme]);

  useEffect(() => {
    const applyMode = (isDark: boolean) => {
      if (isDark) {
        document.documentElement.classList.add('dark');
        document.documentElement.style.colorScheme = 'dark';
      } else {
        document.documentElement.classList.remove('dark');
        document.documentElement.style.colorScheme = 'light';
      }
    };

    if (darkMode === 'system') {
      if (typeof window !== 'undefined' && window.matchMedia) {
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        applyMode(mediaQuery.matches);

        const listener = (e: MediaQueryListEvent) => applyMode(e.matches);
        mediaQuery.addEventListener('change', listener);
        return () => mediaQuery.removeEventListener('change', listener);
      }
      applyMode(false);
    } else {
      applyMode(darkMode === 'dark');
    }
  }, [darkMode]);

  useEffect(() => {
    let link = document.querySelector<HTMLLinkElement>("link[rel~='icon']");
    if (!link) {
      link = document.createElement('link');
      link.rel = 'icon';
      link.type = 'image/svg+xml';
      document.head.appendChild(link);
    }
    link.href = faviconUri;
  }, []);

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
        <header className="border-b border-border-default bg-surface-50/50 px-6 py-2.5 shrink-0 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="min-w-0 flex flex-col justify-center">
              <h1 className="text-base font-bold tracking-tight text-text-ink dark:text-text-on-primary sm:text-lg truncate leading-tight">
                {projectName || 'Test Execution Report'}
              </h1>
              <div className="mt-1 flex items-center gap-2 flex-wrap text-xs text-text-body-mid dark:text-text-muted min-w-0">
                <span
                  className="font-medium text-text-ink dark:text-text-on-primary max-w-md truncate"
                  title={testRunName || 'Playwright Test Reporter'}
                >
                  {testRunName || 'Playwright Test Reporter'}
                </span>
                {summary && (
                  <>
                    <span className="text-text-muted/60 font-medium">·</span>
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
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-success-500/10 px-2.5 py-0.5 text-[11px] font-bold text-success-600 ring-1 ring-inset ring-success-500/20 dark:bg-success-500/20 dark:text-success-400 dark:ring-success-500/30">
                      <svg
                        className="h-3 w-3 text-success-600 dark:text-success-400 shrink-0"
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
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0 pt-0.5">
            <ThemeControls
              theme={theme}
              setTheme={setTheme}
              darkMode={darkMode}
              setDarkMode={(mode) => {
                setDarkMode(mode);
                localStorage.setItem('zen-dark-mode', mode);
              }}
            />
          </div>
        </header>

        <div className="flex-1 overflow-auto">
          <div className="mx-auto max-w-full px-6 sm:px-8 pt-6 sm:pt-8 pb-8">
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
              activeTab === 'projects' && (
                <Suspense
                  fallback={
                    <div className="flex items-center justify-center py-24 text-sm text-text-body-mid">
                      Loading projects…
                    </div>
                  }
                >
                  <ProjectsSection suites={suites} />
                </Suspense>
              )}

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
              <Suspense
                fallback={
                  <div className="flex items-center justify-center py-24 text-sm text-text-body-mid">
                    Loading trends…
                  </div>
                }
              >
                <TrendsSection
                  history={historyData}
                  suites={suites}
                  isHistoryDisabled={isHistoryDisabled}
                />
              </Suspense>
            )}

            {!isLoading && !isSummaryView && !isMinimalReport && activeTab === 'insights' && (
              <Suspense
                fallback={
                  <div className="flex items-center justify-center py-24 text-sm text-text-body-mid">
                    Loading insights…
                  </div>
                }
              >
                <InsightsSection
                  history={historyData}
                  suites={suites}
                  isHistoryDisabled={isHistoryDisabled}
                />
              </Suspense>
            )}

            {!isLoading && !isSummaryView && !isMinimalReport && activeTab === 'history' && (
              <HistorySection history={historyData} isHistoryDisabled={isHistoryDisabled} />
            )}
          </div>
        </div>
      </main>

      <BackToTopButton activeTab={activeTab} />
    </div>
  );
}
