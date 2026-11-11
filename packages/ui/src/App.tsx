import faviconRaw from '@/assets/favicon.svg?raw';
import Overview from '@/components/dashboard/Overview';
import FailuresSection from '@/components/failures/FailuresSection';
import FilesSection from '@/components/files/FilesSection';
import HistorySection from '@/components/history/HistorySection';
import Sidebar, { type TabKey } from '@/components/layout/Sidebar';
import ThemeControls from '@/components/layout/ThemeControls';
import HeaderRunSwitcher from '@/components/layout/HeaderRunSwitcher';
import { ConfigGeneratorModal } from '@/components/layout/ConfigGeneratorModal';
import { ShortcutsModal } from '@/components/shared/ShortcutsModal';
import BackToTopButton from '@/components/shared/BackToTopButton';
import RunSwitcherModal from '@/components/shared/RunSwitcherModal';
import Toast, { type ToastNotification } from '@/components/shared/Toast';
import SuitesSection from '@/components/suites/SuitesSection';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { copyToClipboard } from '@/utils/clipboard';
import { formatDateRange, formatDuration, normalizeTheme, parseDarkMode } from '@arpanp/zen-core';
import type { HistoryData, HistoryRun } from '@arpanp/zen-core';
import type { ReportData, TestSuite } from '@arpanp/zen-core';
import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';

const ProjectsSection = lazy(() => import('@/components/projects/ProjectsSection'));
const TrendsSection = lazy(() => import('@/components/trends/TrendsSection'));
const InsightsSection = lazy(() => import('@/components/insights/InsightsSection'));

const faviconUri = `data:image/svg+xml;utf8,${encodeURIComponent(faviconRaw)}`;

export type ThemeMode = 'sage' | 'lotus' | 'oasis';

/**
 * Normalizes a raw theme value into the dashboard's lowercase `ThemeMode` id.
 *
 * @param value - Raw theme from localStorage, report data, or the theme switcher.
 * @returns The canonical lowercase theme id, or `null` when unrecognized.
 */
function toThemeMode(value: string | null | undefined): ThemeMode | null {
  const normalized = normalizeTheme(value);
  if (!normalized) return null;
  return normalized.toLowerCase() as ThemeMode;
}

declare global {
  interface WindowEventMap {
    'zen:expand-all': CustomEvent<void>;
    'zen:collapse-all': CustomEvent<void>;
    'zen:open-quick-switcher': CustomEvent<void>;
    'zen:close-quick-switcher': CustomEvent<void>;
  }
}

/**
 * Zen Reporter root application component. Loads run history, manages tab state, theming,
 * keyboard shortcuts, and renders the dashboard layout.
 *
 * @returns The rendered root application component.
 */
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
  const [isConfigGeneratorOpen, setIsConfigGeneratorOpen] = useState(false);
  const [isShortcutsModalOpen, setIsShortcutsModalOpen] = useState(false);
  const [toastNotification, setToastNotification] = useState<ToastNotification | null>(null);
  const [loadError, setLoadError] = useState<{ runId: string; message: string } | null>(null);
  const flashTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
      const normalized = toThemeMode(saved);
      if (normalized) {
        return normalized;
      }
    }

    const testRun = initialReportData?.testRun;
    const configuredTheme = testRun?.theme;

    if (configuredTheme) {
      const normalized = toThemeMode(configuredTheme);
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

    return parseDarkMode(initialReportData?.testRun?.darkMode);
  });

  const [commitCopied, setCommitCopied] = useState(false);
  const [branchCopied, setBranchCopied] = useState(false);

  const applyThemeAndDarkMode = (data: ReportData) => {
    const testRun = data?.testRun;

    if (testRun) {
      if (testRun.theme && typeof window !== 'undefined' && !localStorage.getItem('zen-theme')) {
        const normalized = toThemeMode(testRun.theme);
        if (normalized) {
          setTheme(normalized);
        }
      }
      if (
        testRun.darkMode !== undefined &&
        typeof window !== 'undefined' &&
        !localStorage.getItem('zen-dark-mode')
      ) {
        setDarkMode(parseDarkMode(testRun.darkMode));
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

  /**
   * Applies the latest run's report data to the dashboard, resets the selected run state
   * to null (canonical latest-run state), and shows the success toast confirming the switch.
   *
   * @param data - Parsed report data payload of the latest execution run.
   * @returns {void} No return value; updates dashboard state, loading state, and toast notification.
   */
  const applyLatestReport = useCallback((data: ReportData) => {
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
  }, []);

  const loadLatestRun = useCallback(
    async (shouldPushState = true) => {
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
            applyLatestReport(data);
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
            applyLatestReport(data);
            return;
          }
        } catch {
          /* ignore error */
        } finally {
          setIsLoading(false);
        }
      }
      setIsLoading(false);
    },
    [applyLatestReport]
  );

  /**
   * Routes run selection to the appropriate loader. Selecting the latest run goes through
   * loadLatestRun so the canonical latest-run state (no `runId` in the URL, selectedRunId
   * reset to null, latest-run toast) is consistent across all switcher paths (L shortcut,
   * number shortcuts, and row clicks); every other run goes through loadRunById.
   *
   * @param runId - Unique identifier of the run the user requested to switch to.
   * @returns {void} No return value; triggers loadLatestRun for the latest run or loadRunById otherwise.
   */
  const handleSelectRun = useCallback(
    (runId: string) => {
      const latestRunId =
        historyData && historyData.runs.length > 0
          ? historyData.runs[historyData.runs.length - 1].run_id
          : null;
      if (latestRunId !== null && runId === latestRunId) {
        void loadLatestRun(true);
      } else {
        void loadRunById(runId, true);
      }
    },
    [historyData, loadRunById, loadLatestRun]
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
              setHistoryData(JSON.parse(text) as HistoryData);
            } catch {
              /* fall through to fetch */
            }
          }
        }

        // If running over HTTP (server mode), fetch the full history dataset (up to 50 runs or DB query)
        // so the user gets complete historical depth seamlessly
        if (typeof window !== 'undefined' && window.location.protocol !== 'file:') {
          try {
            const resp = await fetch('./history.json');
            if (resp.ok) {
              const fullHistory = (await resp.json()) as HistoryData;
              setHistoryData(fullHistory);
              return;
            }
          } catch {
            /* keep inline history if fetch fails */
          }
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

  const availableTabs: TabKey[] = useMemo(() => {
    if (isMinimalReport) {
      return ['overview', 'suites', 'files', 'failures'];
    }
    return ['overview', 'projects', 'suites', 'files', 'failures', 'history', 'insights', 'trends'];
  }, [isMinimalReport]);

  const handleSelectTabByIndex = useCallback(
    (index: number) => {
      if (index >= 0 && index < availableTabs.length) {
        setActiveTabState(availableTabs[index]);
      }
    },
    [availableTabs]
  );

  const handleNextTab = useCallback(() => {
    const currentIndex = availableTabs.indexOf(activeTab);
    if (currentIndex >= 0) {
      const nextIndex = (currentIndex + 1) % availableTabs.length;
      setActiveTabState(availableTabs[nextIndex]);
    }
  }, [availableTabs, activeTab]);

  const handlePrevTab = useCallback(() => {
    const currentIndex = availableTabs.indexOf(activeTab);
    if (currentIndex >= 0) {
      const prevIndex = (currentIndex - 1 + availableTabs.length) % availableTabs.length;
      setActiveTabState(availableTabs[prevIndex]);
    }
  }, [availableTabs, activeTab]);

  const handleToggleDarkMode = useCallback(() => {
    setDarkMode((prev) => {
      const nextMode = prev === 'system' ? 'light' : prev === 'light' ? 'dark' : 'system';
      if (typeof window !== 'undefined') {
        localStorage.setItem('zen-dark-mode', nextMode);
      }
      return nextMode;
    });
  }, []);

  const handleCopyCommit = useCallback(() => {
    const commitToCopy = summary?.gitCommitFull || summary?.gitCommit;
    if (!commitToCopy) return;

    copyToClipboard(commitToCopy).then((success) => {
      if (success) {
        setCommitCopied(true);
        setTimeout(() => setCommitCopied(false), 2000);
        setToastNotification({
          id: `copy-commit-${Date.now()}`,
          type: 'success',
          title: 'Copied to clipboard',
          message: `Copied full commit SHA "${commitToCopy}" to clipboard.`,
        });
      }
    });
  }, [summary?.gitCommitFull, summary?.gitCommit]);

  const handleCopyBranch = useCallback(() => {
    const branchToCopy = summary?.gitBranch;
    if (!branchToCopy) return;

    copyToClipboard(branchToCopy).then((success) => {
      if (success) {
        setBranchCopied(true);
        setTimeout(() => setBranchCopied(false), 2000);
        setToastNotification({
          id: `copy-branch-${Date.now()}`,
          type: 'success',
          title: 'Copied to clipboard',
          message: `Copied branch name "${branchToCopy}" to clipboard.`,
        });
      }
    });
  }, [summary?.gitBranch]);

  const handleActiveRunSelected = useCallback((run: HistoryRun) => {
    setToastNotification({
      id: `already-active-run-${Date.now()}`,
      type: 'info',
      title: 'Already Viewing Run',
      message: `You are already viewing "${run.run_name}".`,
      duration: 3000,
    });
  }, []);

  const handleOpenWebsite = useCallback(() => {
    if (typeof window !== 'undefined') {
      window.open('https://zen-reporter.vercel.app', '_blank', 'noopener,noreferrer');
    }
  }, []);

  const handleFocusSearch = useCallback(() => {
    const container = contentContainerRef.current;
    if (!container) return;

    const inputs = Array.from(
      container.querySelectorAll<HTMLInputElement>('input[data-search-input="true"]')
    ).filter((el) => {
      // Must be visible and enabled
      const rect = el.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0 && !el.disabled;
    });

    if (inputs.length === 0) return;

    if (inputs.length === 1) {
      inputs[0].focus();
      inputs[0].select();
      return;
    }

    // Viewport-aware search: find the search input that is closest to or within the viewport
    const viewportMiddle = window.innerHeight / 2;

    let targetInput = inputs[0];
    let minDistance = Infinity;

    for (const input of inputs) {
      const rect = input.getBoundingClientRect();
      // Distance from center of input to center of viewport
      const inputCenter = (rect.top + rect.bottom) / 2;
      const distance = Math.abs(inputCenter - viewportMiddle);

      if (distance < minDistance) {
        minDistance = distance;
        targetInput = input;
      }
    }

    targetInput.focus();
    targetInput.select();
  }, []);

  const handleScrollToTop = useCallback(() => {
    if (contentContainerRef.current) {
      contentContainerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, []);

  const handlePaginationStep = useCallback((direction: 'prev' | 'next') => {
    const container = contentContainerRef.current;
    if (!container) return;

    const footers = Array.from(
      container.querySelectorAll<HTMLElement>('[data-pagination-footer="true"]')
    ).filter((el) => {
      const rect = el.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0;
    });

    if (footers.length === 0) return;

    let targetFooter = footers[0];

    if (footers.length > 1) {
      // Viewport-aware selection: find the pagination footer closest to viewport vertical center
      const viewportMiddle = window.innerHeight / 2;
      let minDistance = Infinity;

      for (const footer of footers) {
        const rect = footer.getBoundingClientRect();
        const footerCenter = (rect.top + rect.bottom) / 2;
        const distance = Math.abs(footerCenter - viewportMiddle);
        if (distance < minDistance) {
          minDistance = distance;
          targetFooter = footer;
        }
      }
    }

    const buttonSelector =
      direction === 'prev' ? '[data-pagination-prev="true"]' : '[data-pagination-next="true"]';
    const btn = targetFooter.querySelector<HTMLButtonElement>(buttonSelector);
    if (!btn || btn.disabled) return;

    // Scroll past the pagination footer / table end so that the bottom border and padding are clearly visible
    const tableSection =
      targetFooter.closest('section') ||
      targetFooter.parentElement?.querySelector('table') ||
      targetFooter.previousElementSibling ||
      targetFooter;

    const sectionRect = tableSection.getBoundingClientRect();
    const bottomPadding = 32; // ensure comfortable breathing room below bottom border
    const isSectionEndVisible =
      sectionRect.bottom + bottomPadding <=
        (window.innerHeight || document.documentElement.clientHeight) && sectionRect.bottom >= 0;

    if (!isSectionEndVisible) {
      if (contentContainerRef.current) {
        // Calculate the scroll position inside the scrollable container
        const containerRect = contentContainerRef.current.getBoundingClientRect();
        const targetScrollTop =
          contentContainerRef.current.scrollTop +
          (sectionRect.bottom - containerRect.bottom) +
          bottomPadding;
        contentContainerRef.current.scrollTo({
          top: targetScrollTop,
          behavior: 'smooth',
        });
      } else {
        targetFooter.scrollIntoView({ behavior: 'smooth', block: 'end' });
      }
    }

    // Trigger subtle body flash animation on the table
    const tableEl =
      targetFooter.closest('section')?.querySelector('table') ||
      targetFooter.parentElement?.querySelector('table');
    if (tableEl) {
      if (flashTimeoutRef.current) {
        clearTimeout(flashTimeoutRef.current);
      }
      tableEl.classList.remove('animate-page-flash');
      // trigger reflow to restart css animation
      void tableEl.offsetWidth;
      tableEl.classList.add('animate-page-flash');
      flashTimeoutRef.current = setTimeout(() => {
        tableEl.classList.remove('animate-page-flash');
      }, 400);
    }

    btn.click();
  }, []);

  // Listen to mouse/manual page change events from PaginationFooter to trigger the subtle table body flash animation
  useEffect(() => {
    const handleCustomPageChange = () => {
      // Find the table that was likely affected and apply flash animation
      const activeElement = document.activeElement;
      const targetFooter =
        activeElement?.closest('[data-pagination-footer="true"]') ||
        document.querySelector('[data-pagination-footer="true"]');
      const tableEl =
        targetFooter?.closest('section')?.querySelector('table') ||
        targetFooter?.parentElement?.querySelector('table') ||
        document.querySelector('table');

      if (tableEl) {
        if (flashTimeoutRef.current) {
          clearTimeout(flashTimeoutRef.current);
        }
        tableEl.classList.remove('animate-page-flash');
        void tableEl.offsetWidth;
        tableEl.classList.add('animate-page-flash');
        flashTimeoutRef.current = setTimeout(() => {
          tableEl.classList.remove('animate-page-flash');
        }, 400);
      }
    };

    window.addEventListener('zen:page-change', handleCustomPageChange);
    return () => {
      window.removeEventListener('zen:page-change', handleCustomPageChange);
      if (flashTimeoutRef.current) {
        clearTimeout(flashTimeoutRef.current);
      }
    };
  }, []);

  const handleCycleTheme = useCallback(() => {
    const themes: ThemeMode[] = ['sage', 'lotus', 'oasis'];
    setTheme((prev) => {
      const currentIndex = themes.indexOf(prev);
      const nextTheme = themes[(currentIndex + 1) % themes.length];
      if (typeof window !== 'undefined') {
        localStorage.setItem('zen-theme', nextTheme);
      }
      return nextTheme;
    });
  }, []);

  const isAnyModalOpen = isRunSwitcherOpen || isConfigGeneratorOpen || isShortcutsModalOpen;

  useKeyboardShortcuts({
    onToggleSidebar: () => setIsCollapsed((prev) => !prev),
    onSelectTabByIndex: handleSelectTabByIndex,
    onNextTab: handleNextTab,
    onPrevTab: handlePrevTab,
    onToggleDarkMode: handleToggleDarkMode,
    onCycleTheme: handleCycleTheme,
    /**
     * Opens the full run switcher modal and closes the quick switcher dropdown so both
     * keydown handlers are never active at the same time.
     *
     * @returns {void} No return value; dispatches the 'zen:close-quick-switcher' window event
     * and sets the run switcher modal open state to true when at least one run exists.
     */
    onOpenRunSwitcher: () => {
      if (historyData && historyData.runs && historyData.runs.length > 0) {
        window.dispatchEvent(new CustomEvent('zen:close-quick-switcher'));
        setIsRunSwitcherOpen(true);
      }
    },
    /**
     * Opens the header quick run switcher dropdown.
     *
     * @returns {void} No return value; dispatches the 'zen:open-quick-switcher' window event when multiple runs exist.
     */
    onOpenRunSwitcherQuick: () => {
      if (historyData && historyData.runs && historyData.runs.length > 1) {
        window.dispatchEvent(new CustomEvent('zen:open-quick-switcher'));
      }
    },
    onOpenConfigGenerator: () => setIsConfigGeneratorOpen(true),
    onOpenHelp: () => setIsShortcutsModalOpen(true),
    onCopyCommit: handleCopyCommit,
    onCopyBranch: handleCopyBranch,
    onOpenWebsite: handleOpenWebsite,
    onFocusSearch: handleFocusSearch,
    onScrollToTop: handleScrollToTop,
    onPrevPage: () => handlePaginationStep('prev'),
    onNextPage: () => handlePaginationStep('next'),
    onExpandAll: () => {
      if (activeTab === 'suites' || activeTab === 'failures') {
        window.dispatchEvent(new CustomEvent('zen:expand-all'));
      }
    },
    onCollapseAll: () => {
      if (activeTab === 'suites' || activeTab === 'failures') {
        window.dispatchEvent(new CustomEvent('zen:collapse-all'));
      }
    },
    isModalOpen: isAnyModalOpen,
  });

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
          onOpenConfigGenerator={() => setIsConfigGeneratorOpen(true)}
          onOpenHelp={() => setIsShortcutsModalOpen(true)}
        />
      )}

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden bg-canvas">
        {/* Top Bar with Project/Run Name & Theme Switch */}
        <header className="h-24 border-b border-border-default bg-surface-50/50 px-6 sm:px-8 shrink-0 flex items-center justify-between gap-6 py-3">
          <div className="flex flex-col justify-between h-full min-w-0">
            {/* Row 1: Breadcrumb */}
            <div className="flex items-center gap-2 text-base sm:text-lg font-bold tracking-tight text-text-ink dark:text-text-on-primary leading-tight min-w-0">
              <span className="font-extrabold text-text-ink dark:text-text-on-primary truncate">
                {projectName || 'Test Execution Report'}
              </span>
              <svg
                className="h-4 w-4 text-text-muted shrink-0"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
              <span
                className="font-medium text-text-body-mid dark:text-text-muted truncate max-w-md"
                title={testRunName || 'Playwright Test Reporter'}
              >
                {testRunName || 'Playwright Test Reporter'}
              </span>
            </div>

            {/* Row 2: Controls & Metadata */}
            <div className="flex items-center gap-2.5 flex-wrap text-xs text-text-body-mid dark:text-text-muted min-w-0">
              {historyData && historyData.runs && historyData.runs.length > 1 && (
                <>
                  <HeaderRunSwitcher
                    currentRunId={
                      selectedRunId ||
                      (historyData?.runs?.[historyData.runs.length - 1]?.run_id ?? null)
                    }
                    runs={historyData.runs}
                    onSelectRun={handleSelectRun}
                    onOpenFullModal={() => setIsRunSwitcherOpen(true)}
                    onActiveRunSelected={handleActiveRunSelected}
                  />
                  <span className="text-text-muted/60 font-medium select-none">|</span>
                </>
              )}
              {summary && (
                <>
                  <div className="inline-flex items-center gap-1.5 h-7.5 text-xs font-medium text-text-body-mid dark:text-text-muted leading-none shrink-0 select-none">
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
                    <span>{formatDateRange(summary.startTime, summary.endTime)}</span>
                  </div>
                  <span className="text-text-muted/60 font-medium select-none">|</span>
                  <div className="inline-flex items-center gap-1.5 h-7.5 text-xs font-semibold text-success-700 dark:text-success-400 leading-none shrink-0 select-none">
                    <svg
                      className="h-3.5 w-3.5 text-success-600 dark:text-success-400 shrink-0"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <line x1="10" x2="14" y1="2" y2="2" />
                      <line x1="12" x2="15" y1="14" y2="11" />
                      <circle cx="12" cy="14" r="8" />
                    </svg>
                    <span>{formatDuration(summary.duration)}</span>
                  </div>
                  {(summary.gitBranch || summary.gitCommit) && (
                    <>
                      {summary.gitBranch && (
                        <>
                          <span className="text-text-muted/60 font-medium select-none">|</span>
                          <div className="inline-flex items-center gap-1.5 h-7.5 text-xs font-semibold leading-none text-text-ink dark:text-text-on-primary shrink-0 select-none">
                            <svg
                              className="h-3.5 w-3.5 text-accent-blue shrink-0"
                              viewBox="0 0 16 16"
                              fill="currentColor"
                            >
                              <path d="M9.5 3.25a2.25 2.25 0 1 1 3 2.122V6A2.5 2.5 0 0 1 10 8.5H6a1 1 0 0 0-1 1v1.128a2.251 2.251 0 1 1-1.5 0V5.372a2.25 2.25 0 1 1 1.5 0v1.836A2.493 2.493 0 0 1 6 7h4a1 1 0 0 0 1-1v-.628A2.25 2.25 0 0 1 9.5 3.25Zm-6 0a.75.75 0 1 0 1.5 0 .75.75 0 0 0-1.5 0Zm8.25-.75a.75.75 0 1 0 0 1.5.75.75 0 0 0 0-1.5ZM4.25 12a.75.75 0 1 0 0 1.5.75.75 0 0 0 0-1.5Z" />
                            </svg>
                            <span className="truncate max-w-56">{summary.gitBranch}</span>
                            <button
                              type="button"
                              onClick={handleCopyBranch}
                              className="inline-flex items-center justify-center p-1 rounded-md text-text-muted hover:text-accent-blue hover:bg-surface-200/60 transition-colors cursor-pointer"
                              title={`Copy branch name (${summary.gitBranch}) (b)`}
                              aria-label="Copy branch name"
                            >
                              {branchCopied ? (
                                <svg
                                  className="h-3.5 w-3.5 text-success-600 dark:text-success-400"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  stroke="currentColor"
                                  strokeWidth={2.5}
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                >
                                  <polyline points="20 6 9 17 4 12" />
                                </svg>
                              ) : (
                                <svg
                                  className="h-3.5 w-3.5"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  stroke="currentColor"
                                  strokeWidth={2}
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                >
                                  <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
                                  <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
                                </svg>
                              )}
                            </button>
                          </div>
                        </>
                      )}
                      {summary.gitCommit && (
                        <>
                          <span className="text-text-muted/60 font-medium select-none">|</span>
                          <div className="inline-flex items-center gap-1.5 h-7.5 text-xs font-mono font-semibold leading-none text-text-ink dark:text-text-on-primary shrink-0 select-none">
                            <svg
                              className="h-3.5 w-3.5 text-accent-blue shrink-0"
                              viewBox="0 0 16 16"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth={1.75}
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <circle cx="8" cy="8" r="3" />
                              <line x1="8" y1="1" x2="8" y2="5" />
                              <line x1="8" y1="11" x2="8" y2="15" />
                            </svg>
                            <span>{summary.gitCommit}</span>
                            <button
                              type="button"
                              onClick={handleCopyCommit}
                              className="inline-flex items-center justify-center p-1 rounded-md text-text-muted hover:text-accent-blue hover:bg-surface-200/60 transition-colors cursor-pointer font-sans"
                              title={`Copy commit SHA (${summary.gitCommitFull || summary.gitCommit}) (g)`}
                              aria-label="Copy commit SHA"
                            >
                              {commitCopied ? (
                                <svg
                                  className="h-3.5 w-3.5 text-success-600 dark:text-success-400"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  stroke="currentColor"
                                  strokeWidth={2.5}
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                >
                                  <polyline points="20 6 9 17 4 12" />
                                </svg>
                              ) : (
                                <svg
                                  className="h-3.5 w-3.5"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  stroke="currentColor"
                                  strokeWidth={2}
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                >
                                  <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
                                  <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
                                </svg>
                              )}
                            </button>
                          </div>
                        </>
                      )}
                    </>
                  )}
                </>
              )}
            </div>
          </div>

          <div className="flex flex-col justify-between h-full shrink-0">
            <ThemeControls
              layout="stack"
              theme={theme}
              setTheme={(t) => {
                const normalized = toThemeMode(t);
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
          onActiveRunSelected={handleActiveRunSelected}
        />
      )}

      <ConfigGeneratorModal
        isOpen={isConfigGeneratorOpen}
        onClose={() => setIsConfigGeneratorOpen(false)}
        activeConfig={{
          projectName,
          testRunName,
          theme: normalizeTheme(reportData?.testRun?.theme) ?? undefined,
          darkMode: reportData?.testRun?.darkMode,
          minimalReport: reportData?.testRun?.minimalReport,
          enableHistory: reportData?.testRun?.enableHistory,
        }}
      />

      <ShortcutsModal
        isOpen={isShortcutsModalOpen}
        onClose={() => setIsShortcutsModalOpen(false)}
      />
    </div>
  );
}
