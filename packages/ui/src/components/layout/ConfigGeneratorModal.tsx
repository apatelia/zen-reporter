import { useState, useMemo, useRef, useEffect } from 'react';
import BaseModal from '../shared/BaseModal';
import InfoTooltip from '../shared/InfoTooltip';
import { copyToClipboard } from '@/utils/clipboard';
import { escapeHTML, highlightSyntaxLine, parseDarkMode } from '@arpanp/zen-core';
import type { HistoryConfig, ThemeMode, ThemeName } from '@arpanp/zen-core';

export interface ConfigGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeConfig?: {
    outputDir?: string;
    isCustomOutputDir?: boolean;
    projectName?: string;
    testRunName?: string;
    theme?: ThemeMode | ThemeName;
    isCustomTheme?: boolean;
    darkMode?: 'system' | 'light' | 'dark' | boolean;
    isCustomDarkMode?: boolean;
    singleSummaryFile?: boolean;
    minimalReport?: boolean;
    enableHistory?: 'auto' | boolean;
    history?: HistoryConfig;
    consoleProgress?: 'auto' | 'line' | 'dot' | boolean;
    openAutomatically?: 'always' | 'never' | 'on-failure-only';
  };
}

const GEAR_ICON_PATH =
  'M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.332.184.735.2 1.08.047l1.196-.532a1.125 1.125 0 011.396.346l1.296 2.245a1.125 1.125 0 01-.286 1.411l-1.02.825a1.125 1.125 0 00-.41 1.047c.074.394.074.8 0 1.194a1.125 1.125 0 00.41 1.047l1.02.825c.394.318.52.85.286 1.411l-1.296 2.245a1.125 1.125 0 01-1.396.346l-1.196-.532a1.125 1.125 0 00-1.08.047c-.332.184-.582.496-.645.87l-.213 1.281c-.09.542-.56.94-1.11.94h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281a1.125 1.125 0 00-.645-.87 1.125 1.125 0 00-1.08-.047l-1.196.532a1.125 1.125 0 01-1.396-.346l-1.296-2.245a1.125 1.125 0 01.286-1.411l1.02-.825a1.125 1.125 0 00.41-1.047 7.15 7.15 0 010-1.194 1.125 1.125 0 00-.41-1.047l-1.02-.825a1.125 1.125 0 01-.286-1.411l1.296-2.245a1.125 1.125 0 011.396-.346l1.196.532c.345.153.748.137 1.08-.047.332-.184.582-.496.645-.87l.213-1.281z';

export interface ConfigLine {
  text: string;
  isChanged: boolean;
}

interface ConfigState {
  outputDir: string;
  projectName: string;
  testRunName: string;
  theme: 'Sage' | 'Lotus' | 'Oasis';
  darkMode: 'system' | 'true' | 'false';
  singleSummaryFile: boolean;
  minimalReport: boolean;
  historyMode: 'auto' | 'enabled' | 'disabled' | 'remote';
  consoleProgress: 'auto' | 'line' | 'dot' | 'false';
  openAutomatically: 'never' | 'always' | 'on-failure-only';
  serverUrl: string;
  projectId: string;
  runId: string;
  fallbackToLocal: boolean;
  timeoutMs: string;
  dbFilename: string;
  windowSize: string;
  maxRuns: string;
}

/**
 * Renders a small blue indicator dot for settings changed from initial baseline values.
 *
 * @returns Indicator dot JSX element.
 */
function ModifiedDot() {
  return (
    <span
      className="inline-block w-1.5 h-1.5 rounded-full bg-accent-blue shrink-0"
      title="Modified from active configuration"
    />
  );
}

/**
 * Parses a numeric input string, returning the fallback when the value is empty or not a valid number.
 *
 * @param value - Numeric input string from a form field.
 * @param fallback - Value to use when the input is empty or invalid.
 * @returns Parsed number, or the fallback.
 */
function parseNumberOrDefault(value: string, fallback: number): number {
  const parsed = Number(value);
  return value && !Number.isNaN(parsed) ? parsed : fallback;
}

/**
 * Resolves effective local history settings and flags whether any deviate from defaults.
 *
 * @param dbFilename - Candidate database filename.
 * @param windowSize - Candidate report window size (string from form input).
 * @param maxRuns - Candidate retention limit (string from form input).
 * @returns Resolved local history config plus a `hasCustom` flag.
 */
function buildLocalHistoryConfig(
  dbFilename: string,
  windowSize: string,
  maxRuns: string
): { hasCustom: boolean; mode: 'local'; dbFilename: string; maxRuns: number; windowSize: number } {
  const resolvedDbFilename = dbFilename || 'history.db';
  const resolvedMaxRuns = parseNumberOrDefault(maxRuns, 1000);
  const resolvedWindowSize = parseNumberOrDefault(windowSize, 50);
  return {
    hasCustom:
      resolvedDbFilename !== 'history.db' || resolvedMaxRuns !== 1000 || resolvedWindowSize !== 50,
    mode: 'local',
    dbFilename: resolvedDbFilename,
    maxRuns: resolvedMaxRuns,
    windowSize: resolvedWindowSize,
  };
}

/**
 * Appends a JSON config entry (single- or multi-line) to the generated config lines with correct
 * indentation and trailing commas.
 *
 * @param lines - Target config lines array to append to.
 * @param entry - JSON entry with key, serializable value, and modified flag.
 * @param isLast - Whether this is the final entry (controls the trailing comma).
 * @returns void.
 */
function pushJsonEntry(
  lines: ConfigLine[],
  entry: { key: string; value: unknown; isChanged: boolean },
  isLast: boolean
): void {
  const serialized = JSON.stringify(entry.value, null, 2);
  if (!serialized.includes('\n')) {
    lines.push({
      text: `  "${entry.key}": ${serialized}${isLast ? '' : ','}`,
      isChanged: entry.isChanged,
    });
    return;
  }

  const subLines = serialized.split('\n');
  subLines.forEach((subLine, subIdx) => {
    const isFirst = subIdx === 0;
    const trailingComma = subIdx === subLines.length - 1 && !isLast ? ',' : '';
    lines.push({
      text: isFirst ? `  "${entry.key}": ${subLine}` : `  ${subLine}${trailingComma}`,
      isChanged: entry.isChanged,
    });
  });
}

/**
 * Interactive modal that allows users to configure Zen Reporter options and copy ready-to-use Playwright configuration code.
 *
 * @param props - Modal properties including open status, close handler, and active reporter configuration.
 * @returns Config generator modal dialog component.
 */
export function ConfigGeneratorModal({ isOpen, onClose, activeConfig }: ConfigGeneratorModalProps) {
  // Baseline initial config from current active test run
  const initialConfig = useMemo<ConfigState>(() => {
    const dark = parseDarkMode(activeConfig?.darkMode);
    const darkVal: 'system' | 'true' | 'false' =
      dark === 'dark' ? 'true' : dark === 'light' ? 'false' : 'system';

    const activeHistory = activeConfig?.history;
    let historyVal: 'auto' | 'enabled' | 'disabled' | 'remote' = 'auto';
    let initServerUrl = '';
    let initProjectId = '';
    let initRunId = '';
    let initFallbackToLocal = true;
    let initTimeoutMs = '5000';
    let initDbFilename = 'history.db';
    let initWindowSize = '50';
    let initMaxRuns = '1000';

    if (activeHistory !== undefined) {
      if (
        activeHistory === false ||
        (typeof activeHistory === 'object' &&
          activeHistory !== null &&
          activeHistory.mode === 'off')
      ) {
        historyVal = 'disabled';
      } else if (activeHistory === true) {
        historyVal = 'enabled';
      } else if (typeof activeHistory === 'object' && activeHistory !== null) {
        if (activeHistory.mode === 'remote') {
          historyVal = 'remote';
          if (activeHistory.serverUrl) initServerUrl = String(activeHistory.serverUrl);
          if (activeHistory.projectId) initProjectId = String(activeHistory.projectId);
          if (activeHistory.runId) initRunId = String(activeHistory.runId);
          if (typeof activeHistory.fallbackToLocal === 'boolean') {
            initFallbackToLocal = activeHistory.fallbackToLocal;
          }
          if (activeHistory.timeoutMs != null) initTimeoutMs = String(activeHistory.timeoutMs);
        } else {
          // local mode or unspecified mode
          historyVal = 'auto';
          if ('dbFilename' in activeHistory && activeHistory.dbFilename) {
            initDbFilename = String(activeHistory.dbFilename);
          } else if ('dbPath' in activeHistory && activeHistory.dbPath) {
            // Strip dirname if user previously passed path
            const parts = String(activeHistory.dbPath).split(/[/\\]/);
            initDbFilename = parts[parts.length - 1] || 'history.db';
          }
          if (activeHistory.windowSize != null) initWindowSize = String(activeHistory.windowSize);
          if (activeHistory.maxRuns != null) initMaxRuns = String(activeHistory.maxRuns);
        }
      }
    } else if (activeConfig?.enableHistory === false) {
      historyVal = 'disabled';
    } else if (activeConfig?.enableHistory === true) {
      historyVal = 'enabled';
    } else {
      historyVal = 'auto';
    }

    const resolvedOutputDir = activeConfig?.outputDir || 'zen-report';

    return {
      outputDir: resolvedOutputDir,
      projectName: activeConfig?.projectName || 'Test Automation Project',
      testRunName: activeConfig?.testRunName || 'Nightly Build #{N}',
      theme: (activeConfig?.theme as 'Sage' | 'Lotus' | 'Oasis') || 'Sage',
      darkMode: darkVal,
      singleSummaryFile: activeConfig?.singleSummaryFile ?? true,
      minimalReport: activeConfig?.minimalReport ?? false,
      historyMode: historyVal,
      consoleProgress: 'auto',
      openAutomatically: (activeConfig?.openAutomatically || 'never') as
        'never' | 'always' | 'on-failure-only',
      serverUrl: initServerUrl,
      projectId: initProjectId,
      runId: initRunId,
      fallbackToLocal: initFallbackToLocal,
      timeoutMs: initTimeoutMs,
      dbFilename: initDbFilename,
      windowSize: initWindowSize,
      maxRuns: initMaxRuns,
    };
  }, [activeConfig]);

  // Working state initialized with active report values
  const [format, setFormat] = useState<'ts' | 'js' | 'json'>('ts');

  const [outputDir, setOutputDir] = useState(initialConfig.outputDir);
  const [projectName, setProjectName] = useState(initialConfig.projectName);
  const [testRunName, setTestRunName] = useState(initialConfig.testRunName);
  const [theme, setTheme] = useState<'Sage' | 'Lotus' | 'Oasis'>(initialConfig.theme);
  const [darkMode, setDarkMode] = useState<'system' | 'true' | 'false'>(initialConfig.darkMode);
  const [singleSummaryFile, setSingleSummaryFile] = useState(initialConfig.singleSummaryFile);
  const [minimalReport, setMinimalReport] = useState(initialConfig.minimalReport);
  const [historyMode, setHistoryMode] = useState<'auto' | 'enabled' | 'disabled' | 'remote'>(
    initialConfig.historyMode
  );
  const [consoleProgress, setConsoleProgress] = useState<'auto' | 'line' | 'dot' | 'false'>(
    initialConfig.consoleProgress
  );
  const [openAutomatically, setOpenAutomatically] = useState<
    'never' | 'always' | 'on-failure-only'
  >(initialConfig.openAutomatically);

  const [serverUrl, setServerUrl] = useState(initialConfig.serverUrl);
  const [projectId, setProjectId] = useState(initialConfig.projectId);
  const [runId, setRunId] = useState(initialConfig.runId);
  const [fallbackToLocal, setFallbackToLocal] = useState(initialConfig.fallbackToLocal);
  const [timeoutMs, setTimeoutMs] = useState(initialConfig.timeoutMs);

  const [dbFilename, setDbFilename] = useState(initialConfig.dbFilename);
  const [windowSize, setWindowSize] = useState(initialConfig.windowSize);
  const [maxRuns, setMaxRuns] = useState(initialConfig.maxRuns);

  const [isAdvancedHistoryOpen, setIsAdvancedHistoryOpen] = useState(false);

  const [copied, setCopied] = useState(false);

  // Sync state when modal transitions to open
  const [prevIsOpen, setPrevIsOpen] = useState(isOpen);
  if (isOpen !== prevIsOpen) {
    setPrevIsOpen(isOpen);
    if (isOpen) {
      setOutputDir(initialConfig.outputDir);
      setProjectName(initialConfig.projectName);
      setTestRunName(initialConfig.testRunName);
      setTheme(initialConfig.theme);
      setDarkMode(initialConfig.darkMode);
      setSingleSummaryFile(initialConfig.singleSummaryFile);
      setMinimalReport(initialConfig.minimalReport);
      setHistoryMode(initialConfig.historyMode);
      setConsoleProgress(initialConfig.consoleProgress);
      setOpenAutomatically(initialConfig.openAutomatically);
      setServerUrl(initialConfig.serverUrl);
      setProjectId(initialConfig.projectId);
      setRunId(initialConfig.runId);
      setFallbackToLocal(initialConfig.fallbackToLocal);
      setTimeoutMs(initialConfig.timeoutMs);
      setDbFilename(initialConfig.dbFilename);
      setWindowSize(initialConfig.windowSize);
      setMaxRuns(initialConfig.maxRuns);
    }
  }

  const handleResetAll = () => {
    setOutputDir(initialConfig.outputDir);
    setProjectName(initialConfig.projectName);
    setTestRunName(initialConfig.testRunName);
    setTheme(initialConfig.theme);
    setDarkMode(initialConfig.darkMode);
    setSingleSummaryFile(initialConfig.singleSummaryFile);
    setMinimalReport(initialConfig.minimalReport);
    setHistoryMode(initialConfig.historyMode);
    setConsoleProgress(initialConfig.consoleProgress);
    setOpenAutomatically(initialConfig.openAutomatically);
    setServerUrl(initialConfig.serverUrl);
    setProjectId(initialConfig.projectId);
    setRunId(initialConfig.runId);
    setFallbackToLocal(initialConfig.fallbackToLocal);
    setTimeoutMs(initialConfig.timeoutMs);
    setDbFilename(initialConfig.dbFilename);
    setWindowSize(initialConfig.windowSize);
    setMaxRuns(initialConfig.maxRuns);
  };

  // Difference detection against baseline
  const isOutputDirChanged = outputDir !== initialConfig.outputDir;
  const isProjectNameChanged = projectName !== initialConfig.projectName;
  const isTestRunNameChanged = testRunName !== initialConfig.testRunName;
  const isThemeChanged = theme !== initialConfig.theme;
  const isDarkModeChanged = darkMode !== initialConfig.darkMode;
  const isSingleSummaryFileChanged = singleSummaryFile !== initialConfig.singleSummaryFile;
  const isMinimalReportChanged = minimalReport !== initialConfig.minimalReport;
  const isHistoryModeChanged =
    historyMode !== initialConfig.historyMode ||
    (historyMode === 'remote' &&
      (serverUrl !== initialConfig.serverUrl ||
        projectId !== initialConfig.projectId ||
        runId !== initialConfig.runId ||
        fallbackToLocal !== initialConfig.fallbackToLocal ||
        timeoutMs !== initialConfig.timeoutMs)) ||
    (historyMode === 'enabled' &&
      (dbFilename !== initialConfig.dbFilename ||
        windowSize !== initialConfig.windowSize ||
        maxRuns !== initialConfig.maxRuns));
  const isConsoleProgressChanged = consoleProgress !== initialConfig.consoleProgress;
  const isOpenAutomaticallyChanged = openAutomatically !== initialConfig.openAutomatically;

  const totalChangedCount = [
    isOutputDirChanged,
    isProjectNameChanged,
    isTestRunNameChanged,
    isThemeChanged,
    isDarkModeChanged,
    isSingleSummaryFileChanged,
    isMinimalReportChanged,
    isHistoryModeChanged,
    isConsoleProgressChanged,
    isOpenAutomaticallyChanged,
  ].filter(Boolean).length;

  // Segmented control sliding indicator state
  const tabsContainerRef = useRef<HTMLDivElement>(null);
  const tabButtonsRef = useRef<Record<string, HTMLButtonElement | null>>({});
  const [tabIndicator, setTabIndicator] = useState<{
    left: number;
    top: number;
    width: number;
    height: number;
    opacity: number;
  }>({ left: 0, top: 0, width: 0, height: 0, opacity: 0 });

  useEffect(() => {
    if (!isOpen) return;
    const updateIndicator = () => {
      const container = tabsContainerRef.current;
      const activeButton = tabButtonsRef.current[format];
      if (!container || !activeButton) return;

      const containerRect = container.getBoundingClientRect();
      const activeRect = activeButton.getBoundingClientRect();

      setTabIndicator({
        left: activeRect.left - containerRect.left - container.clientLeft,
        top: activeRect.top - containerRect.top - container.clientTop,
        width: activeRect.width,
        height: activeRect.height,
        opacity: 1,
      });
    };

    updateIndicator();
    const timer = setTimeout(updateIndicator, 50);
    window.addEventListener('resize', updateIndicator);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', updateIndicator);
    };
  }, [format, isOpen]);

  // Generate resultant config lines, tagging each with isChanged
  const configLines = useMemo<ConfigLine[]>(() => {
    // Shared emit decisions (avoid re-declaring per format branch)
    const shouldEmitOutputDir =
      Boolean(activeConfig?.isCustomOutputDir) ||
      (outputDir && outputDir !== 'zen-report') ||
      isOutputDirChanged;
    const shouldEmitDarkMode =
      Boolean(activeConfig?.isCustomDarkMode) || darkMode !== 'system' || isDarkModeChanged;

    const lines: ConfigLine[] = [];

    // JSON format generates a clean standalone zen.config.json file
    if (format === 'json') {
      const jsonEntries: { key: string; value: unknown; isChanged: boolean }[] = [];

      if (shouldEmitOutputDir) {
        jsonEntries.push({
          key: 'outputDir',
          value: outputDir || 'zen-report',
          isChanged: isOutputDirChanged,
        });
      }

      if (projectName) {
        jsonEntries.push({
          key: 'projectName',
          value: projectName,
          isChanged: isProjectNameChanged,
        });
      }

      if (testRunName) {
        jsonEntries.push({
          key: 'testRunName',
          value: testRunName,
          isChanged: isTestRunNameChanged,
        });
      }

      if (theme && theme !== 'Sage') {
        jsonEntries.push({ key: 'theme', value: theme, isChanged: isThemeChanged });
      }

      if (shouldEmitDarkMode) {
        jsonEntries.push({
          key: 'darkMode',
          value: darkMode === 'true' ? true : darkMode === 'false' ? false : 'system',
          isChanged: isDarkModeChanged,
        });
      }

      if (singleSummaryFile) {
        jsonEntries.push({
          key: 'singleSummaryFile',
          value: true,
          isChanged: isSingleSummaryFileChanged,
        });
      }

      if (minimalReport) {
        jsonEntries.push({ key: 'minimalReport', value: true, isChanged: isMinimalReportChanged });
      }

      // History in JSON (defaults such as fallbackToLocal: true are omitted)
      if (historyMode === 'remote') {
        const histObj: Record<string, unknown> = {
          mode: 'remote',
          serverUrl: serverUrl.trim() || '<ENTER_SERVER_URL>',
          projectId: projectId.trim() || '<ENTER_PROJECT_ID>',
        };
        if (runId) histObj.runId = runId;
        if (!fallbackToLocal) histObj.fallbackToLocal = false;
        const timeout = Number(timeoutMs);
        if (timeoutMs && !Number.isNaN(timeout) && timeout !== 5000) histObj.timeoutMs = timeout;

        jsonEntries.push({ key: 'history', value: histObj, isChanged: isHistoryModeChanged });
      } else if (historyMode === 'disabled') {
        jsonEntries.push({ key: 'enableHistory', value: false, isChanged: isHistoryModeChanged });
      } else if (historyMode === 'enabled') {
        const localHistory = buildLocalHistoryConfig(dbFilename, windowSize, maxRuns);
        if (localHistory.hasCustom) {
          jsonEntries.push({
            key: 'history',
            value: localHistory,
            isChanged: isHistoryModeChanged,
          });
        } else {
          jsonEntries.push({ key: 'enableHistory', value: true, isChanged: isHistoryModeChanged });
        }
      }

      if (consoleProgress === 'false') {
        jsonEntries.push({
          key: 'consoleProgress',
          value: false,
          isChanged: isConsoleProgressChanged,
        });
      } else if (consoleProgress !== 'auto') {
        jsonEntries.push({
          key: 'consoleProgress',
          value: consoleProgress,
          isChanged: isConsoleProgressChanged,
        });
      }

      if (openAutomatically !== 'never') {
        jsonEntries.push({
          key: 'openAutomatically',
          value: openAutomatically,
          isChanged: isOpenAutomaticallyChanged,
        });
      }

      lines.push({ text: '{', isChanged: false });
      jsonEntries.forEach((entry, idx) => {
        pushJsonEntry(lines, entry, idx === jsonEntries.length - 1);
      });
      lines.push({ text: '}', isChanged: false });
      return lines;
    }

    const isTs = format === 'ts';
    const headerLines = isTs
      ? [
          "import { defineConfig } from '@playwright/test';",
          '',
          'export default defineConfig({',
          '  reporter: [',
          '    [',
          "      '@arpanp/zen-reporter',",
          '      {',
        ]
      : [
          "const { defineConfig } = require('@playwright/test');",
          '',
          'module.exports = defineConfig({',
          '  reporter: [',
          '    [',
          "      '@arpanp/zen-reporter',",
          '      {',
        ];

    const footerLines = ['      },', '    ],', '  ],', '});'];

    // Header boilerplate
    for (const h of headerLines) {
      lines.push({ text: h, isChanged: false });
    }

    // Output dir (omit when default 'zen-report' unless user configured or modified it)
    if (shouldEmitOutputDir) {
      lines.push({
        text: `        outputDir: '${outputDir || 'zen-report'}',`,
        isChanged: isOutputDirChanged,
      });
    }

    // Project Name
    if (projectName) {
      lines.push({
        text: `        projectName: '${projectName}',`,
        isChanged: isProjectNameChanged,
      });
    }

    // Test Run Name
    if (testRunName) {
      lines.push({
        text: `        testRunName: '${testRunName}',`,
        isChanged: isTestRunNameChanged,
      });
    }

    // Theme (Sage is default, explicit only when non-default or changed)
    if (theme && theme !== 'Sage') {
      lines.push({
        text: `        theme: '${theme}',`,
        isChanged: isThemeChanged,
      });
    }

    // Dark Mode (omit when default 'system' unless user explicitly configured or modified it)
    if (shouldEmitDarkMode) {
      if (darkMode === 'true') {
        lines.push({
          text: `        darkMode: true,`,
          isChanged: isDarkModeChanged,
        });
      } else if (darkMode === 'false') {
        lines.push({
          text: `        darkMode: false,`,
          isChanged: isDarkModeChanged,
        });
      } else {
        lines.push({
          text: `        darkMode: 'system',`,
          isChanged: isDarkModeChanged,
        });
      }
    }

    // Summary File
    if (singleSummaryFile) {
      lines.push({
        text: `        singleSummaryFile: true,`,
        isChanged: isSingleSummaryFileChanged,
      });
    }

    // Minimal Report
    if (minimalReport) {
      lines.push({
        text: `        minimalReport: true,`,
        isChanged: isMinimalReportChanged,
      });
    }

    // History
    if (historyMode === 'remote') {
      const isMissingServerUrl = !serverUrl.trim();
      const isMissingProjectId = !projectId.trim();

      lines.push({ text: `        history: {`, isChanged: isHistoryModeChanged });
      lines.push({ text: `          mode: 'remote',`, isChanged: isHistoryModeChanged });
      lines.push({
        text: isMissingServerUrl
          ? `          serverUrl: '<ENTER_SERVER_URL>', // TODO: Replace with your Zen Reporter server URL`
          : `          serverUrl: '${serverUrl.trim()}',`,
        isChanged: isHistoryModeChanged,
      });
      lines.push({
        text: `          apiKey: process.env.ZEN_REPORTER_API_KEY,`,
        isChanged: isHistoryModeChanged,
      });
      lines.push({
        text: isMissingProjectId
          ? `          projectId: '<ENTER_PROJECT_ID>', // TODO: Replace with your project ID`
          : `          projectId: '${projectId.trim()}',`,
        isChanged: isHistoryModeChanged,
      });
      if (runId) {
        lines.push({
          text: `          runId: '${runId}',`,
          isChanged: isHistoryModeChanged,
        });
      }
      if (!fallbackToLocal) {
        lines.push({
          text: `          fallbackToLocal: false,`,
          isChanged: isHistoryModeChanged,
        });
      }
      const timeout = Number(timeoutMs);
      if (timeoutMs && !Number.isNaN(timeout) && timeout !== 5000) {
        lines.push({
          text: `          timeoutMs: ${timeout},`,
          isChanged: isHistoryModeChanged,
        });
      }
      lines.push({ text: `        },`, isChanged: isHistoryModeChanged });
    } else if (historyMode === 'disabled') {
      lines.push({
        text: `        enableHistory: false,`,
        isChanged: isHistoryModeChanged,
      });
    } else if (historyMode === 'enabled') {
      const localHistory = buildLocalHistoryConfig(dbFilename, windowSize, maxRuns);

      if (localHistory.hasCustom) {
        lines.push({ text: `        history: {`, isChanged: isHistoryModeChanged });
        lines.push({ text: `          mode: 'local',`, isChanged: isHistoryModeChanged });
        lines.push({
          text: `          dbFilename: '${localHistory.dbFilename}',`,
          isChanged: isHistoryModeChanged,
        });
        lines.push({
          text: `          maxRuns: ${localHistory.maxRuns},`,
          isChanged: isHistoryModeChanged,
        });
        lines.push({
          text: `          windowSize: ${localHistory.windowSize},`,
          isChanged: isHistoryModeChanged,
        });
        lines.push({ text: `        },`, isChanged: isHistoryModeChanged });
      } else {
        lines.push({
          text: `        enableHistory: true,`,
          isChanged: isHistoryModeChanged,
        });
      }
    }

    // Console Progress
    if (consoleProgress === 'false') {
      lines.push({
        text: `        consoleProgress: false,`,
        isChanged: isConsoleProgressChanged,
      });
    } else if (consoleProgress !== 'auto') {
      lines.push({
        text: `        consoleProgress: '${consoleProgress}',`,
        isChanged: isConsoleProgressChanged,
      });
    }

    // Auto open
    if (openAutomatically !== 'never') {
      lines.push({
        text: `        openAutomatically: '${openAutomatically}',`,
        isChanged: isOpenAutomaticallyChanged,
      });
    }

    // Footer boilerplate
    for (const f of footerLines) {
      lines.push({ text: f, isChanged: false });
    }

    return lines;
  }, [
    format,
    activeConfig,
    outputDir,
    projectName,
    testRunName,
    theme,
    darkMode,
    singleSummaryFile,
    minimalReport,
    historyMode,
    consoleProgress,
    openAutomatically,
    serverUrl,
    projectId,
    runId,
    fallbackToLocal,
    timeoutMs,
    dbFilename,
    windowSize,
    maxRuns,
    isOutputDirChanged,
    isProjectNameChanged,
    isTestRunNameChanged,
    isThemeChanged,
    isDarkModeChanged,
    isSingleSummaryFileChanged,
    isMinimalReportChanged,
    isHistoryModeChanged,
    isConsoleProgressChanged,
    isOpenAutomaticallyChanged,
  ]);

  // Clean code string for clipboard copy
  const cleanCode = useMemo(() => {
    return configLines.map((l) => l.text).join('\n') + '\n';
  }, [configLines]);

  const targetFileName =
    format === 'ts'
      ? 'playwright.config.ts'
      : format === 'js'
        ? 'playwright.config.js'
        : 'zen.config.json';

  const handleCopy = () => {
    copyToClipboard(cleanCode).then((success) => {
      if (success) {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    });
  };

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2">
          <svg
            className="h-5 w-5 text-accent-blue shrink-0"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.75}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d={GEAR_ICON_PATH} />
            <circle cx="12" cy="12" r="3" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span className="text-base font-bold text-text-ink dark:text-text-on-primary">
            Playwright Config Generator
          </span>
        </div>
      }
      subtitle={
        totalChangedCount > 0 ? (
          <span className="text-accent-blue font-medium">
            {totalChangedCount} setting{totalChangedCount > 1 ? 's' : ''} modified from active
            configuration (highlighted in preview)
          </span>
        ) : (
          `Customize Zen Reporter options and copy the configuration directly into your ${targetFileName}`
        )
      }
      headerActions={
        <div className="flex items-center gap-2 select-none">
          {totalChangedCount > 0 ? (
            <>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-accent-blue/15 text-accent-blue border border-accent-blue/30">
                <span className="w-1.5 h-1.5 rounded-full bg-accent-blue animate-pulse" />
                <span>Modified configuration</span>
              </span>
              <button
                type="button"
                onClick={handleResetAll}
                className="text-xs font-semibold text-accent-blue hover:underline cursor-pointer px-2.5 py-1 rounded bg-accent-blue/10 border border-accent-blue/20 transition-colors"
              >
                Reset all
              </button>
            </>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-surface-200/50 dark:bg-surface-950 text-text-body-mid dark:text-text-muted border border-border-default/70">
              <span className="w-1.5 h-1.5 rounded-full bg-success-500" />
              <span>Active configuration</span>
            </span>
          )}
        </div>
      }
      maxWidthClass="max-w-5xl lg:max-w-6xl"
      maxHeightClass="max-h-[92vh]"
    >
      <div className="flex flex-col lg:flex-row gap-5 h-full min-h-0">
        {/* Left column: Visual Form Controls */}
        <div className="w-full lg:w-[48%] space-y-2 text-xs shrink-0">
          {/* General Settings */}
          <div className="space-y-2 rounded-lg border border-border-default/80 bg-surface-50/50 dark:bg-surface-100/40 p-2.5">
            <h4 className="font-bold text-text-ink dark:text-text-on-primary uppercase tracking-wider text-[10px]">
              General Settings
            </h4>

            {/* Project Name & Test Run Name (2-column layout) */}
            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="font-medium text-text-ink dark:text-text-on-primary flex items-center gap-1.5 mb-1">
                  <span>Project Name</span>
                  {isProjectNameChanged && <ModifiedDot />}
                </label>
                <input
                  type="text"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  placeholder="My E2E Project"
                  className={`w-full rounded-md border bg-canvas px-2.5 py-1 text-xs text-text-ink dark:text-text-on-primary focus:border-accent-blue focus:outline-hidden transition-colors ${
                    isProjectNameChanged
                      ? 'border-accent-blue ring-1 ring-accent-blue/30'
                      : 'border-border-default'
                  }`}
                />
              </div>

              <div>
                <label className="font-medium text-text-ink dark:text-text-on-primary flex items-center gap-1.5 mb-1">
                  <span>Test Run Name</span>
                  {isTestRunNameChanged && <ModifiedDot />}
                </label>
                <input
                  type="text"
                  value={testRunName}
                  onChange={(e) => setTestRunName(e.target.value)}
                  placeholder="Nightly Build #{N}"
                  className={`w-full rounded-md border bg-canvas px-2.5 py-1 text-xs text-text-ink dark:text-text-on-primary focus:border-accent-blue focus:outline-hidden transition-colors ${
                    isTestRunNameChanged
                      ? 'border-accent-blue ring-1 ring-accent-blue/30'
                      : 'border-border-default'
                  }`}
                />
              </div>
            </div>

            {/* Output Directory */}
            <div>
              <label className="font-medium text-text-ink dark:text-text-on-primary flex items-center gap-1.5 mb-1">
                <span>Output Directory</span>
                {!activeConfig?.isCustomOutputDir &&
                  !isOutputDirChanged &&
                  outputDir === 'zen-report' && (
                    <span className="text-[10px] text-text-muted font-normal">(Using default)</span>
                  )}
                {isOutputDirChanged && <ModifiedDot />}
              </label>
              <input
                type="text"
                value={outputDir}
                onChange={(e) => setOutputDir(e.target.value)}
                placeholder="zen-report"
                className={`w-full rounded-md border bg-canvas px-2.5 py-1 text-xs text-text-ink dark:text-text-on-primary focus:border-accent-blue focus:outline-hidden transition-colors ${
                  isOutputDirChanged
                    ? 'border-accent-blue ring-1 ring-accent-blue/30'
                    : 'border-border-default'
                }`}
              />
            </div>
          </div>

          {/* Theme & Display Options */}
          <div className="space-y-2 rounded-lg border border-border-default/80 bg-surface-50/50 dark:bg-surface-100/40 p-2.5">
            <h4 className="font-bold text-text-ink dark:text-text-on-primary uppercase tracking-wider text-[10px]">
              Theme & Presentation
            </h4>

            <div className="grid grid-cols-2 gap-2.5">
              {/* Theme */}
              <div>
                <label className="font-medium text-text-ink dark:text-text-on-primary flex items-center gap-1.5 mb-1">
                  <span>Theme</span>
                  {!activeConfig?.isCustomTheme && !isThemeChanged && theme === 'Sage' && (
                    <span className="text-[10px] text-text-muted font-normal">(Using default)</span>
                  )}
                  {isThemeChanged && <ModifiedDot />}
                </label>
                <select
                  value={theme}
                  onChange={(e) => setTheme(e.target.value as 'Sage' | 'Lotus' | 'Oasis')}
                  className={`w-full rounded-md border bg-canvas px-2.5 py-1 text-xs text-text-ink dark:text-text-on-primary focus:border-accent-blue focus:outline-hidden cursor-pointer transition-colors ${
                    isThemeChanged
                      ? 'border-accent-blue ring-1 ring-accent-blue/30'
                      : 'border-border-default'
                  }`}
                >
                  <option value="Sage">Sage (Green / Classic)</option>
                  <option value="Lotus">Lotus (Indigo / Lime)</option>
                  <option value="Oasis">Oasis (Electric Blue / Navy)</option>
                </select>
              </div>

              {/* Dark Mode */}
              <div>
                <label className="font-medium text-text-ink dark:text-text-on-primary flex items-center gap-1.5 mb-1">
                  <span>Dark Mode State</span>
                  {!activeConfig?.isCustomDarkMode &&
                    !isDarkModeChanged &&
                    darkMode === 'system' && (
                      <span className="text-[10px] text-text-muted font-normal">
                        (Using default)
                      </span>
                    )}
                  {isDarkModeChanged && <ModifiedDot />}
                </label>
                <select
                  value={darkMode}
                  onChange={(e) => setDarkMode(e.target.value as 'system' | 'true' | 'false')}
                  className={`w-full rounded-md border bg-canvas px-2.5 py-1 text-xs text-text-ink dark:text-text-on-primary focus:border-accent-blue focus:outline-hidden cursor-pointer transition-colors ${
                    isDarkModeChanged
                      ? 'border-accent-blue ring-1 ring-accent-blue/30'
                      : 'border-border-default'
                  }`}
                >
                  <option value="system">Follow OS (system)</option>
                  <option value="true">Dark Mode Always</option>
                  <option value="false">Light Mode Always</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5 pt-0.5">
              {/* Single Summary File */}
              <div className="flex items-center gap-2 select-none">
                <input
                  type="checkbox"
                  id="cfg-summary-html"
                  checked={singleSummaryFile}
                  onChange={(e) => setSingleSummaryFile(e.target.checked)}
                  className="rounded border-border-default text-accent-blue focus:ring-accent-blue cursor-pointer"
                />
                <label
                  htmlFor="cfg-summary-html"
                  className="font-medium text-text-ink dark:text-text-on-primary flex items-center gap-1.5 cursor-pointer"
                >
                  <span>
                    Standalone <code className="text-accent-blue">summary.html</code>
                  </span>
                  {isSingleSummaryFileChanged && <ModifiedDot />}
                </label>
                <InfoTooltip
                  text="Generates an independent, self-contained single summary.html file with test results summary embedded, ideal for CI/CD artifacts or email attachments."
                  position="top"
                />
              </div>

              {/* Minimal Report */}
              <div className="flex items-center gap-2 select-none">
                <input
                  type="checkbox"
                  id="cfg-minimal-report"
                  checked={minimalReport}
                  onChange={(e) => setMinimalReport(e.target.checked)}
                  className="rounded border-border-default text-accent-blue focus:ring-accent-blue cursor-pointer"
                />
                <label
                  htmlFor="cfg-minimal-report"
                  className="font-medium text-text-ink dark:text-text-on-primary flex items-center gap-1.5 cursor-pointer"
                >
                  <span>Minimal Report</span>
                  {isMinimalReportChanged && <ModifiedDot />}
                </label>
                <InfoTooltip
                  text="Completely disables run history tracking, and produces a lightweight report output, hiding heavy analytical and historical trend views for ultra-fast load times. Use it when you don't need historical data."
                  position="top"
                  isLast
                />
              </div>
            </div>
          </div>

          {/* History Mode & Execution */}
          <div className="space-y-2 rounded-lg border border-border-default/80 bg-surface-50/50 dark:bg-surface-100/40 p-2.5">
            <h4 className="font-bold text-text-ink dark:text-text-on-primary uppercase tracking-wider text-[10px]">
              History & Execution
            </h4>

            {/* History Mode */}
            <div>
              <label className="font-medium text-text-ink dark:text-text-on-primary flex items-center gap-1.5 mb-1">
                <span>History Recording Mode</span>
                {!isHistoryModeChanged && historyMode === 'auto' && (
                  <span className="text-[10px] text-text-muted font-normal">(Using default)</span>
                )}
                {isHistoryModeChanged && <ModifiedDot />}
              </label>
              <select
                value={historyMode}
                onChange={(e) => {
                  const newMode = e.target.value as 'auto' | 'enabled' | 'disabled' | 'remote';
                  setHistoryMode(newMode);
                  if (newMode === 'remote') {
                    if (!timeoutMs) setTimeoutMs('5000');
                  } else if (newMode !== 'disabled') {
                    if (!dbFilename) setDbFilename('history.db');
                    if (!windowSize) setWindowSize('50');
                    if (!maxRuns) setMaxRuns('1000');
                  }
                }}
                className={`w-full rounded-md border bg-canvas px-2.5 py-1 text-xs text-text-ink dark:text-text-on-primary focus:border-accent-blue focus:outline-hidden cursor-pointer transition-colors ${
                  isHistoryModeChanged
                    ? 'border-accent-blue ring-1 ring-accent-blue/30'
                    : 'border-border-default'
                }`}
              >
                <option value="auto">Auto (SQLite / DuckDB if installed)</option>
                <option value="enabled">Explicitly Enabled (requires @duckdb/node-api)</option>
                <option value="disabled">Disabled (Single-run only)</option>
                <option value="remote">Remote SaaS / Team Server</option>
              </select>
            </div>

            {historyMode === 'remote' && (
              <div className="p-2.5 rounded-md bg-canvas border border-border-default space-y-1.5">
                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="font-medium text-text-ink dark:text-text-on-primary flex items-center gap-1.5 mb-1">
                      <span>Server URL</span>
                      <span className="text-[10px] text-amber-500/90 font-normal">(Required)</span>
                    </label>
                    <input
                      type="text"
                      value={serverUrl}
                      onChange={(e) => setServerUrl(e.target.value)}
                      placeholder="https://zen-reporter.your-company.com"
                      className="w-full rounded-md border border-border-default bg-surface-50 dark:bg-surface-100 px-2.5 py-1 text-xs text-text-ink dark:text-text-on-primary focus:border-accent-blue focus:outline-hidden"
                    />
                  </div>
                  <div>
                    <label className="font-medium text-text-ink dark:text-text-on-primary flex items-center gap-1.5 mb-1">
                      <span>Project Identifier</span>
                      <span className="text-[10px] text-amber-500/90 font-normal">(Required)</span>
                    </label>
                    <input
                      type="text"
                      value={projectId}
                      onChange={(e) => setProjectId(e.target.value)}
                      placeholder="my-project"
                      className="w-full rounded-md border border-border-default bg-surface-50 dark:bg-surface-100 px-2.5 py-1 text-xs text-text-ink dark:text-text-on-primary focus:border-accent-blue focus:outline-hidden"
                    />
                  </div>
                </div>
                <div className="flex items-center justify-between text-[10px] text-text-muted pt-0.5">
                  <span>
                    Uses{' '}
                    <code className="text-accent-blue font-mono">
                      process.env.ZEN_REPORTER_API_KEY
                    </code>
                  </span>
                  <div className="flex items-center gap-1 shrink-0">
                    <span>Server storage & DB info</span>
                    <InfoTooltip
                      text="The Playwright test runner connects via HTTP and uploads artifacts via presigned URLs. Database (DATABASE_URL) and object storage (S3/GCS/Azure) are configured on your backend server container, not in Playwright."
                      position="top"
                      isLast
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Advanced History Options Accordion (visible for Remote SaaS or Explicitly Enabled local) */}
            {(historyMode === 'remote' || historyMode === 'enabled') && (
              <div className="rounded-md border border-border-default/70 bg-canvas/60">
                <button
                  type="button"
                  onClick={() => setIsAdvancedHistoryOpen(!isAdvancedHistoryOpen)}
                  className="w-full px-2.5 py-1.5 flex items-center justify-between text-left font-medium text-text-ink dark:text-text-on-primary hover:bg-surface-100/50 dark:hover:bg-surface-100/20 transition-colors cursor-pointer"
                >
                  <span className="flex items-center gap-1.5 text-[11px]">
                    <span>Advanced History Settings</span>
                    {(historyMode === 'remote'
                      ? runId !== initialConfig.runId ||
                        fallbackToLocal !== initialConfig.fallbackToLocal ||
                        timeoutMs !== initialConfig.timeoutMs
                      : dbFilename !== initialConfig.dbFilename ||
                        windowSize !== initialConfig.windowSize ||
                        maxRuns !== initialConfig.maxRuns) && <ModifiedDot />}
                  </span>
                  <svg
                    className={`w-3.5 h-3.5 text-text-muted transition-transform duration-200 ${
                      isAdvancedHistoryOpen ? 'rotate-180' : ''
                    }`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {isAdvancedHistoryOpen && (
                  <div className="p-2.5 pt-1.5 border-t border-border-default/70 space-y-2 bg-surface-50/30 dark:bg-surface-100/20">
                    {historyMode === 'remote' ? (
                      <>
                        <div className="grid grid-cols-2 gap-2.5">
                          <div>
                            <label className="text-[11px] font-medium text-text-ink dark:text-text-on-primary flex items-center gap-1.5 mb-1">
                              <span>Run ID (Optional)</span>
                              <InfoTooltip
                                text="Unique identifier for deduplication across sharded CI runs. When omitted, Zen Reporter falls back to CI environment variables (ZEN_REPORTER_RUN_ID or GITHUB_RUN_ID), then a deterministic ID derived from the run's start time, name, and shard."
                                position="top"
                                isFirst
                              />
                            </label>
                            <input
                              type="text"
                              value={runId}
                              onChange={(e) => setRunId(e.target.value)}
                              placeholder="e.g. process.env.GITHUB_RUN_ID"
                              className="w-full rounded-md border border-border-default bg-canvas px-2 py-1 text-xs text-text-ink dark:text-text-on-primary focus:border-accent-blue focus:outline-hidden"
                            />
                          </div>
                          <div>
                            <label className="text-[11px] font-medium text-text-ink dark:text-text-on-primary flex items-center gap-1.5 mb-1">
                              <span>Timeout (ms)</span>
                              {timeoutMs === '5000' && (
                                <span className="text-[10px] text-text-muted font-normal">
                                  (Using default)
                                </span>
                              )}
                            </label>
                            <input
                              type="number"
                              min="1000"
                              step="500"
                              value={timeoutMs}
                              onChange={(e) => setTimeoutMs(e.target.value)}
                              placeholder="5000"
                              className="w-full rounded-md border border-border-default bg-canvas px-2 py-1 text-xs text-text-ink dark:text-text-on-primary focus:border-accent-blue focus:outline-hidden"
                            />
                          </div>
                        </div>
                        <div className="flex items-center gap-2 select-none pt-0.5">
                          <input
                            type="checkbox"
                            id="cfg-fallback-to-local"
                            checked={fallbackToLocal}
                            onChange={(e) => setFallbackToLocal(e.target.checked)}
                            className="rounded border-border-default text-accent-blue focus:ring-accent-blue cursor-pointer"
                          />
                          <label
                            htmlFor="cfg-fallback-to-local"
                            className="text-[11px] font-medium text-text-ink dark:text-text-on-primary cursor-pointer flex items-center gap-1.5"
                          >
                            <span>Fallback to local SQLite if remote unreachable</span>
                            {fallbackToLocal && (
                              <span className="text-[10px] text-text-muted font-normal">
                                (Using default)
                              </span>
                            )}
                          </label>
                          <InfoTooltip
                            text="When true, saves a local SQLite copy in outputDir/history.db if the remote ingestion server is offline or unreachable."
                            position="top"
                            isLast
                          />
                        </div>
                      </>
                    ) : (
                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <label className="text-[11px] font-medium text-text-ink dark:text-text-on-primary flex items-center gap-1.5 mb-1">
                            <span>Database File</span>
                            {dbFilename === 'history.db' && (
                              <span className="text-[10px] text-text-muted font-normal">
                                (Using default)
                              </span>
                            )}
                          </label>
                          <input
                            type="text"
                            value={dbFilename}
                            onChange={(e) => setDbFilename(e.target.value)}
                            placeholder="history.db"
                            className="w-full rounded-md border border-border-default bg-canvas px-2 py-1 text-xs text-text-ink dark:text-text-on-primary focus:border-accent-blue focus:outline-hidden"
                          />
                        </div>
                        <div>
                          <label className="text-[11px] font-medium text-text-ink dark:text-text-on-primary flex items-center gap-1.5 mb-1">
                            <span>Report Runs</span>
                            {windowSize === '50' && (
                              <span className="text-[10px] text-text-muted font-normal">
                                (Using default)
                              </span>
                            )}
                          </label>
                          <input
                            type="number"
                            min="1"
                            value={windowSize}
                            onChange={(e) => setWindowSize(e.target.value)}
                            placeholder="50"
                            className="w-full rounded-md border border-border-default bg-canvas px-2 py-1 text-xs text-text-ink dark:text-text-on-primary focus:border-accent-blue focus:outline-hidden"
                          />
                        </div>
                        <div>
                          <label className="text-[11px] font-medium text-text-ink dark:text-text-on-primary flex items-center gap-1.5 mb-1">
                            <span>Retention Limit</span>
                            {maxRuns === '1000' && (
                              <span className="text-[10px] text-text-muted font-normal">
                                (Using default)
                              </span>
                            )}
                          </label>
                          <input
                            type="number"
                            min="0"
                            value={maxRuns}
                            onChange={(e) => setMaxRuns(e.target.value)}
                            placeholder="1000"
                            className="w-full rounded-md border border-border-default bg-canvas px-2 py-1 text-xs text-text-ink dark:text-text-on-primary focus:border-accent-blue focus:outline-hidden"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            <div className="grid grid-cols-2 gap-2.5">
              {/* Console Progress */}
              <div>
                <label className="font-medium text-text-ink dark:text-text-on-primary flex items-center gap-1.5 mb-1">
                  <span>Console Progress</span>
                  {!isConsoleProgressChanged && consoleProgress === 'auto' && (
                    <span className="text-[10px] text-text-muted font-normal">(Using default)</span>
                  )}
                  {isConsoleProgressChanged && <ModifiedDot />}
                </label>
                <select
                  value={consoleProgress}
                  onChange={(e) =>
                    setConsoleProgress(e.target.value as 'auto' | 'line' | 'dot' | 'false')
                  }
                  className={`w-full rounded-md border bg-canvas px-2.5 py-1 text-xs text-text-ink dark:text-text-on-primary focus:border-accent-blue focus:outline-hidden cursor-pointer transition-colors ${
                    isConsoleProgressChanged
                      ? 'border-accent-blue ring-1 ring-accent-blue/30'
                      : 'border-border-default'
                  }`}
                >
                  <option value="auto">Auto (detect TTY)</option>
                  <option value="line">Single Line Ticker</option>
                  <option value="dot">Multi-Line Dot Mode</option>
                  <option value="false">Disabled (Silent)</option>
                </select>
              </div>

              {/* Open Automatically */}
              <div>
                <label className="font-medium text-text-ink dark:text-text-on-primary flex items-center gap-1.5 mb-1">
                  <span>Auto-Open Report</span>
                  {!isOpenAutomaticallyChanged && openAutomatically === 'never' && (
                    <span className="text-[10px] text-text-muted font-normal">(Using default)</span>
                  )}
                  {isOpenAutomaticallyChanged && <ModifiedDot />}
                </label>
                <select
                  value={openAutomatically}
                  onChange={(e) =>
                    setOpenAutomatically(e.target.value as 'never' | 'always' | 'on-failure-only')
                  }
                  className={`w-full rounded-md border bg-canvas px-2.5 py-1 text-xs text-text-ink dark:text-text-on-primary focus:border-accent-blue focus:outline-hidden cursor-pointer transition-colors ${
                    isOpenAutomaticallyChanged
                      ? 'border-accent-blue ring-1 ring-accent-blue/30'
                      : 'border-border-default'
                  }`}
                >
                  <option value="never">Never</option>
                  <option value="on-failure-only">On Failure Only</option>
                  <option value="always">Always</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Right column: Resultant Code Preview */}
        <div className="flex-1 flex flex-col min-w-0 bg-surface-100/60 dark:bg-surface-950 rounded-lg border border-border-default overflow-hidden">
          {/* Code Header Bar */}
          <div className="flex items-center justify-between gap-3 px-3 py-2 border-b border-border-default bg-surface-50 dark:bg-surface-950 shrink-0">
            {/* Left: Segmented File Switcher with Smooth Sliding Indicator (matching ThemeControls style & animation) */}
            <div className="flex items-center gap-2.5">
              <div
                ref={tabsContainerRef}
                className="relative inline-flex items-center h-8.5 rounded-lg border border-border-default bg-surface-100 dark:bg-surface-950/70 p-0.5 shadow-2xs shrink-0"
              >
                {/* Sliding Indicator */}
                <div
                  aria-hidden="true"
                  style={{
                    transform: `translate3d(${tabIndicator.left}px, ${tabIndicator.top}px, 0)`,
                    width: `${tabIndicator.width}px`,
                    height: `${tabIndicator.height}px`,
                    opacity: tabIndicator.opacity,
                  }}
                  className="pointer-events-none absolute left-0 top-0 rounded-md bg-canvas shadow-xs ring-1 ring-border-default/80 dark:bg-surface-200 dark:ring-1 dark:ring-white/20 dark:shadow-md transition-all duration-250 ease-[cubic-bezier(0.2,0,0,1)]"
                />

                <button
                  ref={(el) => {
                    tabButtonsRef.current.ts = el;
                  }}
                  type="button"
                  onClick={() => setFormat('ts')}
                  className={`relative z-10 px-3 h-full flex items-center text-xs font-sans transition-colors duration-150 cursor-pointer ${
                    format === 'ts'
                      ? 'font-bold text-text-ink dark:text-text-on-primary'
                      : 'text-text-body-mid hover:text-text-ink hover:bg-surface-200/40 dark:text-text-muted dark:hover:text-text-on-primary font-medium'
                  }`}
                >
                  TypeScript (.ts)
                </button>

                <button
                  ref={(el) => {
                    tabButtonsRef.current.js = el;
                  }}
                  type="button"
                  onClick={() => setFormat('js')}
                  className={`relative z-10 px-3 h-full flex items-center text-xs font-sans transition-colors duration-150 cursor-pointer ${
                    format === 'js'
                      ? 'font-bold text-text-ink dark:text-text-on-primary'
                      : 'text-text-body-mid hover:text-text-ink hover:bg-surface-200/40 dark:text-text-muted dark:hover:text-text-on-primary font-medium'
                  }`}
                >
                  JavaScript (.js)
                </button>

                <button
                  ref={(el) => {
                    tabButtonsRef.current.json = el;
                  }}
                  type="button"
                  onClick={() => setFormat('json')}
                  className={`relative z-10 px-3 h-full flex items-center text-xs font-sans transition-colors duration-150 cursor-pointer ${
                    format === 'json'
                      ? 'font-bold text-text-ink dark:text-text-on-primary'
                      : 'text-text-body-mid hover:text-text-ink hover:bg-surface-200/40 dark:text-text-muted dark:hover:text-text-on-primary font-medium'
                  }`}
                >
                  JSON (zen.config.json)
                </button>
              </div>
            </div>

            {/* Right: Copy Button (styled identically to UniversalPreviewModal Download button) */}
            <button
              type="button"
              onClick={handleCopy}
              title="Copy clean runnable Playwright config"
              className={`rounded-full px-3 py-1.5 text-xs font-semibold inline-flex items-center gap-1.5 shadow-xs cursor-pointer transition-colors shrink-0 ${
                copied
                  ? 'bg-success-500 text-white dark:text-surface-950'
                  : 'text-text-on-primary dark:text-surface-950 bg-accent-blue hover:bg-accent-blue/90'
              }`}
            >
              {copied ? (
                <>
                  <svg
                    className="h-4 w-4 text-white dark:text-surface-950"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2.5}
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  <span>Copied!</span>
                </>
              ) : (
                <>
                  <svg
                    className="h-4 w-4 text-text-on-primary dark:text-surface-950"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 01-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 011.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 00-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 01-1.125-1.125v-9.25m12 6.625v-1.875a3.375 3.375 0 00-3.375-3.375h-1.5a1.125 1.125 0 01-1.125-1.125v-1.5a3.375 3.375 0 00-3.375-3.375H9.75"
                    />
                  </svg>
                  <span>Copy</span>
                </>
              )}
            </button>
          </div>

          {/* Syntax Highlighted Resultant Code Viewer (aligned with UniversalPreviewModal text log viewport) */}
          <div className="flex-1 overflow-auto p-4 font-mono text-xs leading-relaxed text-text-ink dark:text-slate-200">
            <pre className="font-mono whitespace-pre w-fit min-w-full">
              {configLines.map((line, idx) => {
                const highlighted = highlightSyntaxLine(
                  line.text,
                  format === 'json' ? 'json' : format === 'ts' ? 'typescript' : 'javascript'
                );

                const bgClass = line.isChanged
                  ? 'bg-accent-blue/15 dark:bg-accent-blue/15 border-l-2 border-accent-blue'
                  : 'border-l-2 border-transparent hover:bg-surface-200 dark:hover:bg-surface-200/50';

                return (
                  <div
                    /* eslint-disable-next-line @eslint-react/no-array-index-key */
                    key={`cfg-line-${idx}`}
                    className={`px-3 py-0.5 font-mono flex items-start gap-2 ${bgClass} transition-colors`}
                  >
                    <span
                      className="flex-1 whitespace-pre"
                      /* eslint-disable-next-line @eslint-react/dom-no-dangerously-set-innerhtml */
                      dangerouslySetInnerHTML={{
                        __html: highlighted || escapeHTML(line.text) || '&nbsp;',
                      }}
                    />
                  </div>
                );
              })}
            </pre>
          </div>
        </div>
      </div>
    </BaseModal>
  );
}
