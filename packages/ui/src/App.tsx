import faviconRaw from '@/assets/favicon.svg?raw';
import Overview from '@/components/dashboard/Overview';
import FailuresSection from '@/components/failures/FailuresSection';
import FilesSection from '@/components/files/FilesSection';
import HistorySection from '@/components/history/HistorySection';
import Sidebar, { type TabKey } from '@/components/layout/Sidebar';
import ThemeControls from '@/components/layout/ThemeControls';
import BackToTopButton from '@/components/shared/BackToTopButton';
import RunSwitcherModal from '@/components/shared/RunSwitcherModal';
import Toast, { type ToastNotification } from '@/components/shared/Toast';
import SuitesSection from '@/components/suites/SuitesSection';
import { formatDateRange, formatDuration } from '@arpanp/zen-core';
import type { HistoryData } from '@arpanp/zen-core';
import type { ReportData, TestSuite } from '@arpanp/zen-core';
import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';

const ProjectsSection = lazy(() => import('@/components/projects/ProjectsSection'));
const TrendsSection = lazy(() => import('@/components/trends/TrendsSection'));
const InsightsSection = lazy(() => import('@/components/insights/InsightsSection'));

const faviconUri = `data:image/svg+xml;utf8,${encodeURIComponent(faviconRaw)}`;

export type ThemeMode = 'sage' | 'lotus' | 'oasis';

function normalizeTheme(val?: string | null): ThemeMode | null {
  if (!val) return null;
  const lower = val.toLowerCase();
  if (lower === 'sage' || lower === 'cafe') return 'sage';
  if (lower === 'lotus' || lower === 'sentinel') return 'lotus';
  if (lower === 'oasis' || lower === 'streak') return 'oasis';
  return null;
}

export default function App() {
  const isSummaryView = useMemo(() => {
    if (typeof window === 'undefined') return false;

    const params = new URLSearchParams(window.location.search);

    return params.get('view') === 'summary' || Boolean(window.__ZEN_SUMMARY_ONLY__);
  }, []);

  const [activeTabState, setActiveTabState] = useState<TabKey>('overview');
  const contentContainerRef = useRef<HTMLDivElement>(null);
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [historyData, setHistoryData] = useState<HistoryData | null>(null);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isRunSwitcherOpen, setIsRunSwitcherOpen] = useState(false);
  const [toastNotification, setToastNotification] = useState<ToastNotification | null>(null);
  const [loadError, setLoadError] = useState<{ runId: string; message: string } | null>(null);

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

  const [theme, setTheme] = useState<ThemeMode>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('zen-theme');
      const normalized = normalizeTheme(saved);
      if (normalized) {
        return normalized;
      }
    }

    const testRun = initialReportData?.testRun;
    const configuredTheme = testRun?.theme;

    if (configuredTheme) {
      const normalized = normalizeTheme(configuredTheme);
      if (normalized) {
        return normalized;
      }
    }

    return 'sage';
  });

  const [darkMode, setDarkMode] = useState<'system' | 'light' | 'dark'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('zen-dark-mode');
      if (saved === 'dark' || saved === 'light' || saved === 'system') {
        return saved;
      }
    }

    const testRun = initialReportData?.testRun;

    if (testRun?.darkMode !== undefined) {
      return testRun.darkMode ? 'dark' : 'light';
    }

    return 'system';
  });

  const [commitCopied, setCommitCopied] = useState(false);

  const applyThemeAndDarkMode = (data: ReportData) => {
    const testRun = data?.testRun;

    if (testRun) {
      if (testRun.theme && typeof window !== 'undefined' && !localStorage.getItem('zen-theme')) {
        const normalized = normalizeTheme(testRun.theme);
        if (normalized) {
          setTheme(normalized);
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

  const [selectedRunId, setSelectedRunId] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    const params = new URLSearchParams(window.location.search);
    return params.get('runId');
  });

  const loadRunById = useCallback(
    async (runId: string, shouldPushState = true) => {
      if (typeof window === 'undefined' || window.location.protocol === 'file:') return;
      try {
        setIsLoading(true);
        const resp = await fetch(`/api/runs/${encodeURIComponent(runId)}`);
        if (resp.ok) {
          const data = (await resp.json()) as ReportData;
          setReportData(data);
          setSelectedRunId(runId);
          setLoadError(null);
          applyThemeAndDarkMode(data);

          if (shouldPushState) {
            const url = new URL(window.location.href);
            url.searchParams.set('runId', runId);
            window.history.pushState({ runId }, '', url.toString());
          }

          const targetRunName =
            data.testRun?.testRunName ||
            historyData?.runs?.find((r) => r.run_id === runId)?.run_name ||
            'Selected Run';
          setToastNotification({
            id: String(Date.now()),
            type: 'success',
            title: 'Execution Run Switched',
            message: `Now viewing ${targetRunName}. All report data and dashboards are updated.`,
            duration: 5000,
          });
        } else {
          const errorMsg =
            resp.status === 404
              ? `Execution run "${runId}" not found in history.`
              : `Server returned status ${resp.status} for run ${runId}`;
          setLoadError({ runId, message: errorMsg });
          setSelectedRunId(runId);
          if (shouldPushState) {
            const url = new URL(window.location.href);
            url.searchParams.set('runId', runId);
            window.history.pushState({ runId }, '', url.toString());
          }
          setToastNotification({
            id: String(Date.now()),
            type: 'error',
            title: 'Failed to Switch Run',
            message: errorMsg,
          });
        }
      } catch (e) {
        console.warn(`Failed to fetch run ${runId}:`, e);
        const errorMsg = e instanceof Error ? e.message : 'Network error loading report data';
        setLoadError({ runId, message: errorMsg });
        setSelectedRunId(runId);
        setToastNotification({
          id: String(Date.now()),
          type: 'error',
          title: 'Failed to Switch Run',
          message: errorMsg,
        });
      } finally {
        setIsLoading(false);
      }
    },
    [historyData]
  );

  const loadLatestRun = useCallback(async (shouldPushState = true) => {
    setIsLoading(true);
    setLoadError(null);

    if (shouldPushState && typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.delete('runId');
      window.history.pushState({}, '', url.pathname + (url.search ? url.search : ''));
    }

    // Check inline report data
    const inlineEl = document.getElementById('report-data');
    if (inlineEl) {
      const text = inlineEl.textContent?.trim();
      if (text) {
        try {
          const data = JSON.parse(text) as ReportData;
          setReportData(data);
          applyThemeAndDarkMode(data);
          setSelectedRunId(null);
          setIsLoading(false);
          setToastNotification({
            id: String(Date.now()),
            type: 'success',
            title: 'Switched to Latest Execution Run',
            message: `Now viewing the latest run: ${data.testRun?.testRunName || 'Latest Run'}. All report data and dashboards are updated.`,
            duration: 5000,
          });
          return;
        } catch {
          /* fall through */
        }
      }
    }

    // Fetch latest report.json
    if (typeof window !== 'undefined' && window.location.protocol !== 'file:') {
      try {
        const resp = await fetch('./report.json');
        if (resp.ok) {
          const data = (await resp.json()) as ReportData;
          setReportData(data);
          applyThemeAndDarkMode(data);
          setSelectedRunId(null);
          setToastNotification({
            id: String(Date.now()),
            type: 'success',
            title: 'Switched to Latest Execution Run',
            message: `Now viewing the latest run: ${data.testRun?.testRunName || 'Latest Run'}. All report data and dashboards are updated.`,
            duration: 5000,
          });
          return;
        }
      } catch {
        /* ignore error */
      } finally {
        setIsLoading(false);
      }
    }
    setIsLoading(false);
  }, []);

  const handleSelectRun = useCallback(
    (runId: string) => {
      void loadRunById(runId, true);
    },
    [loadRunById]
  );

  useEffect(() => {
    const handlePopState = () => {
      if (typeof window === 'undefined') return;
      const params = new URLSearchParams(window.location.search);
      const targetRunId = params.get('runId');
      if (targetRunId) {
        void loadRunById(targetRunId, false);
      } else {
        void loadLatestRun(false);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [loadRunById, loadLatestRun]);

  useEffect(() => {
    void (async () => {
      async function loadReportData() {
        if (typeof window !== 'undefined' && window.location.protocol !== 'file:') {
          const params = new URLSearchParams(window.location.search);
          const targetRunId = params.get('runId');
          if (targetRunId) {
            try {
              const resp = await fetch(`/api/runs/${encodeURIComponent(targetRunId)}`);
              if (resp.ok) {
                const data = (await resp.json()) as ReportData;
                setReportData(data);
                applyThemeAndDarkMode(data);
                setSelectedRunId(targetRunId);
                setLoadError(null);
                return;
              }
              const errorMsg =
                resp.status === 404
                  ? `Execution run "${targetRunId}" not found in history.`
                  : `Server returned status ${resp.status} for run ${targetRunId}`;
              setLoadError({ runId: targetRunId, message: errorMsg });
              setSelectedRunId(targetRunId);
              return;
            } catch (e) {
              const errorMsg = e instanceof Error ? e.message : 'Network error loading report data';
              setLoadError({ runId: targetRunId, message: errorMsg });
              setSelectedRunId(targetRunId);
              return;
            }
          }
        }

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

  const effectiveRunId = useMemo(() => {
    return (
      selectedRunId ||
      (historyData?.runs && historyData.runs.length > 0
        ? historyData.runs[historyData.runs.length - 1].run_id
        : null)
    );
  }, [selectedRunId, historyData]);

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

  useEffect(() => {
    if (contentContainerRef.current) {
      contentContainerRef.current.scrollTop = 0;
    }
    if (typeof window !== 'undefined') {
      window.scrollTo(0, 0);
    }
  }, [activeTab]);

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
        <header className="h-16 border-b border-border-default bg-surface-50/50 px-6 sm:px-8 shrink-0 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="min-w-0 flex flex-col justify-center">
              <h1 className="text-base font-bold tracking-tight text-text-ink dark:text-text-on-primary sm:text-lg truncate leading-tight">
                {projectName || 'Test Execution Report'}
              </h1>
              <div className="mt-0.5 flex items-center gap-2 flex-wrap text-xs text-text-body-mid dark:text-text-muted min-w-0">
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
                    {(summary.gitBranch || summary.gitCommit) && (
                      <>
                        <span className="text-text-muted/60 font-medium">·</span>
                        <div className="flex items-center gap-1.5">
                          {summary.gitBranch && (
                            <span
                              className="inline-flex items-center gap-1 rounded-full bg-surface-100 dark:bg-surface-200 border border-border-default px-2 py-0.5 text-[11px] font-semibold text-text-ink dark:text-text-on-primary shadow-2xs max-w-44 truncate"
                              title={`Branch: ${summary.gitBranch}`}
                            >
                              <svg
                                className="h-3 w-3 text-accent-blue shrink-0"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                                strokeWidth={2}
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              >
                                <line x1="6" y1="3" x2="6" y2="15" />
                                <circle cx="18" cy="6" r="3" />
                                <circle cx="6" cy="18" r="3" />
                                <path d="M18 9a9 9 0 0 1-9 9" />
                              </svg>
                              <span className="truncate">{summary.gitBranch}</span>
                            </span>
                          )}
                          {summary.gitCommit && (
                            <button
                              type="button"
                              onClick={() => {
                                const commitToCopy = summary.gitCommitFull || summary.gitCommit;
                                if (commitToCopy && navigator.clipboard?.writeText) {
                                  navigator.clipboard
                                    .writeText(commitToCopy)
                                    .then(() => {
                                      setCommitCopied(true);
                                      setTimeout(() => setCommitCopied(false), 2000);
                                    })
                                    .catch(() => {
                                      // Fallback to execCommand for restricted browser environments
                                      try {
                                        const ta = document.createElement('textarea');
                                        ta.value = commitToCopy;
                                        ta.style.position = 'fixed';
                                        ta.style.opacity = '0';
                                        document.body.appendChild(ta);
                                        ta.focus();
                                        ta.select();
                                        if (document.execCommand('copy')) {
                                          setCommitCopied(true);
                                          setTimeout(() => setCommitCopied(false), 2000);
                                        }
                                        document.body.removeChild(ta);
                                      } catch {
                                        /* ignore fallback failure */
                                      }
                                    });
                                }
                              }}
                              className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-mono font-semibold transition-all cursor-pointer shadow-2xs ${
                                commitCopied
                                  ? 'border-success-500 bg-success-500/15 text-success-700 dark:text-success-400 dark:border-success-500/40'
                                  : 'border-border-default bg-surface-100 dark:bg-surface-200 text-text-ink dark:text-text-on-primary hover:border-accent-blue hover:text-accent-blue dark:hover:border-accent-blue dark:hover:text-accent-blue'
                              }`}
                              title={
                                commitCopied
                                  ? 'Copied full commit SHA!'
                                  : `Click to copy commit SHA (${summary.gitCommitFull || summary.gitCommit})`
                              }
                            >
                              {commitCopied ? (
                                <>
                                  <svg
                                    className="h-3 w-3 text-success-600 dark:text-success-400 shrink-0"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                    strokeWidth={2.5}
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                  >
                                    <polyline points="20 6 9 17 4 12" />
                                  </svg>
                                  <span>Copied!</span>
                                </>
                              ) : (
                                <>
                                  <svg
                                    className="h-3 w-3 text-text-muted shrink-0"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                    strokeWidth={2}
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                  >
                                    <circle cx="12" cy="12" r="4" />
                                    <line x1="1.05" y1="12" x2="7" y2="12" />
                                    <line x1="17.05" y1="12" x2="22.95" y2="12" />
                                  </svg>
                                  <span>{summary.gitCommit}</span>
                                </>
                              )}
                            </button>
                          )}
                        </div>
                      </>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0 pt-0.5">
            {historyData && historyData.runs && historyData.runs.length > 1 && (
              <>
                {(loadError ||
                  (selectedRunId &&
                    historyData.runs[0]?.run_id &&
                    selectedRunId !== historyData.runs[0].run_id)) && (
                  <button
                    type="button"
                    onClick={() => void loadLatestRun(true)}
                    className="inline-flex items-center gap-1.5 h-8 px-2.5 text-xs font-semibold rounded-md border border-accent-blue/30 bg-accent-blue/10 hover:bg-accent-blue/20 text-accent-blue shadow-2xs transition-colors cursor-pointer"
                    title="Return to latest test run"
                  >
                    <svg
                      className="h-3.5 w-3.5 text-accent-blue"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                      />
                    </svg>
                    <span>Latest Run</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setIsRunSwitcherOpen(true)}
                  className="inline-flex items-center gap-1.5 h-8 px-2.5 text-xs font-semibold rounded-md border border-border-default bg-surface-100 hover:bg-surface-200 text-text-ink dark:text-text-on-primary shadow-2xs hover:border-accent-blue transition-colors cursor-pointer"
                  title="Switch test run"
                >
                  <svg
                    className="h-3.5 w-3.5 text-text-muted"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <span>Switch Run</span>
                </button>
              </>
            )}
            <ThemeControls
              theme={theme}
              setTheme={(t) => {
                const normalized = normalizeTheme(t);
                if (normalized) setTheme(normalized);
              }}
              darkMode={darkMode}
              setDarkMode={(mode) => {
                setDarkMode(mode);
                localStorage.setItem('zen-dark-mode', mode);
              }}
            />
          </div>
        </header>

        <div ref={contentContainerRef} className="flex-1 overflow-auto">
          <div className="mx-auto max-w-full px-6 sm:px-8 pt-6 sm:pt-8 pb-8">
            {isLoading && (
              <div className="flex items-center justify-center py-24">
                <div className="text-center">
                  <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-4 border-surface-200 border-t-accent-blue"></div>
                  <p className="text-sm text-text-body-mid">Loading report…</p>
                </div>
              </div>
            )}

            {!isLoading && loadError && (
              <div className="flex items-center justify-center py-16 text-center">
                <div className="max-w-md w-full rounded-xl border border-danger-500/30 bg-surface-50 dark:bg-surface-100/40 p-8 shadow-sm">
                  <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-danger-500/10 text-danger-500 ring-1 ring-danger-500/20">
                    <svg
                      className="h-7 w-7"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={1.75}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
                      />
                    </svg>
                  </div>
                  <h3 className="text-lg font-bold text-text-ink dark:text-text-on-primary">
                    Test Run Not Found
                  </h3>
                  <p className="mt-2 text-sm text-text-body-mid leading-relaxed">
                    Could not load execution run{' '}
                    <code className="rounded bg-surface-200/60 dark:bg-surface-200 px-1.5 py-0.5 font-mono text-xs text-text-ink dark:text-text-on-primary">
                      {loadError.runId}
                    </code>
                    . {loadError.message}
                  </p>
                  <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                    <button
                      type="button"
                      onClick={() => void loadLatestRun(true)}
                      className="inline-flex items-center gap-2 rounded-md bg-accent-blue px-4 py-2 text-xs font-bold text-text-on-primary dark:text-surface-950 hover:bg-accent-blue/90 shadow-xs transition-colors cursor-pointer"
                    >
                      <svg
                        className="h-3.5 w-3.5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                        />
                      </svg>
                      <span>Return to Latest Run</span>
                    </button>
                    {historyData && historyData.runs && historyData.runs.length > 1 && (
                      <button
                        type="button"
                        onClick={() => setIsRunSwitcherOpen(true)}
                        className="inline-flex items-center gap-1.5 rounded-md border border-border-default bg-surface-100 dark:bg-surface-200 px-3.5 py-2 text-xs font-semibold text-text-ink dark:text-text-on-primary hover:bg-surface-200 dark:hover:bg-surface-100 transition-colors cursor-pointer"
                      >
                        <span>Choose From History</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}

            {!isLoading && !loadError && !reportData && (
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

            {!isLoading &&
              !loadError &&
              reportData &&
              (isSummaryView || activeTab === 'overview') &&
              summary && (
                <Overview summary={summary} suites={suites} isMinimalReport={isMinimalReport} />
              )}

            {!isLoading &&
              !loadError &&
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

            {!isLoading && !loadError && !isSummaryView && reportData && activeTab === 'suites' && (
              <SuitesSection suites={suites} />
            )}

            {!isLoading && !loadError && !isSummaryView && reportData && activeTab === 'files' && (
              <FilesSection
                suites={suites}
                isMinimalReport={isMinimalReport}
                testRunName={testRunName}
              />
            )}

            {!isLoading &&
              !loadError &&
              !isSummaryView &&
              reportData &&
              activeTab === 'failures' && (
                <FailuresSection
                  suites={suites}
                  failedCount={failedCount}
                  timedOutCount={timedOutCount}
                  interruptedCount={interruptedCount}
                />
              )}

            {!isLoading &&
              !loadError &&
              !isSummaryView &&
              !isMinimalReport &&
              activeTab === 'trends' && (
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

            {!isLoading &&
              !loadError &&
              !isSummaryView &&
              !isMinimalReport &&
              activeTab === 'insights' && (
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

            {!isLoading &&
              !loadError &&
              !isSummaryView &&
              !isMinimalReport &&
              activeTab === 'history' && (
                <HistorySection
                  history={historyData}
                  isHistoryDisabled={isHistoryDisabled}
                  onSelectRun={handleSelectRun}
                  selectedRunId={effectiveRunId}
                />
              )}
          </div>
        </div>
      </main>

      <BackToTopButton activeTab={activeTab} />

      <Toast
        key={toastNotification?.id ?? 'none'}
        notification={toastNotification}
        onDismiss={() => setToastNotification(null)}
      />

      {historyData && historyData.runs && (
        <RunSwitcherModal
          isOpen={isRunSwitcherOpen}
          onClose={() => setIsRunSwitcherOpen(false)}
          runs={historyData.runs}
          currentRunId={effectiveRunId || ''}
          onSelectRun={(runId) => {
            handleSelectRun(runId);
            setIsRunSwitcherOpen(false);
          }}
        />
      )}
    </div>
  );
}
