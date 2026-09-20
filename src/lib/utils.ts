import type { existsSync as fsExistsSync, readFileSync as fsReadFileSync } from 'fs';
import type { TestStep as PwTestStep } from '@playwright/test/reporter';
import type { Location, ResultSummary, TestCase, TestError, TestStep, TestSuite } from './types';

export interface FsModule {
  existsSync: typeof fsExistsSync;
  readFileSync: typeof fsReadFileSync;
}

let customFsInstance: FsModule | null = null;

export function setFsModule(fsInstance: FsModule | null): void {
  customFsInstance = fsInstance;
}

function getNodeFs(): FsModule | null {
  if (typeof window !== 'undefined') return null;
  if (customFsInstance) return customFsInstance;

  try {
    const proc =
      typeof process !== 'undefined'
        ? (process as unknown as { getBuiltinModule?: (name: string) => FsModule })
        : undefined;
    if (proc && typeof proc.getBuiltinModule === 'function') {
      const builtinFs = proc.getBuiltinModule('fs');
      if (builtinFs) return builtinFs;
    }

    const g = globalThis as unknown as { require?: (mod: string) => FsModule };
    if (typeof g.require === 'function') {
      return g.require('fs');
    }
  } catch {
    return null;
  }

  return null;
}

const fileSnippetCache = new Map<string, string[]>();

export function getStepCodeSnippet(
  location: Location | null | undefined,
  fsModule?: FsModule | null
): string | undefined {
  if (!location || !location.file || !location.line) {
    return undefined;
  }

  try {
    const fs = fsModule || getNodeFs();
    if (!fs) return undefined;

    let filePath = location.file;
    if (!fs.existsSync(filePath)) {
      const resolved =
        typeof process !== 'undefined' && process.cwd ? `${process.cwd()}/${filePath}` : filePath;
      if (fs.existsSync(resolved)) {
        filePath = resolved;
      } else {
        return undefined;
      }
    }

    let lines = fileSnippetCache.get(filePath);
    if (!lines) {
      const content = fs.readFileSync(filePath, 'utf8') as string;
      lines = content.split(/\r?\n/);
      fileSnippetCache.set(filePath, lines);
    }

    const targetLine = location.line;
    if (targetLine < 1 || targetLine > lines.length) return undefined;

    const startLine = Math.max(1, targetLine - 1);
    const endLine = Math.min(lines.length, targetLine + 1);

    const snippetLines: string[] = [];
    for (let l = startLine; l <= endLine; l++) {
      const isTarget = l === targetLine;
      const prefix = isTarget ? '>' : ' ';
      const lineNum = String(l).padStart(4, ' ');
      snippetLines.push(`${prefix} ${lineNum} | ${lines[l - 1]}`);
    }
    return snippetLines.join('\n');
  } catch {
    // Ignore in browser or when file cannot be read
  }

  return undefined;
}

export function highlightJsTokens(code: string): string {
  if (!code) return '';

  const regex =
    /(\/\/[^\n]*)|('(?:\\[\s\S]|[^'\\])*'|"(?:\\[\s\S]|[^"\\])*"|`(?:\\[\s\S]|[^`\\])*`)|(\b(?:await|async|test|expect|const|let|var|function|return|import|from|if|else|try|catch|finally|for|while|do|switch|case|break|continue|default|new|typeof|instanceof)\b)|(\b(?:true|false|null|undefined|\d+)\b)|(\.\w+)/g;

  let result = '';
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(code)) !== null) {
    result += escapeHTML(code.slice(lastIndex, match.index));
    lastIndex = regex.lastIndex;

    const [fullMatch, comment, str, keyword, numBool, method] = match;

    if (comment) {
      result += `<span class="text-slate-500 dark:text-slate-400 italic">${escapeHTML(comment)}</span>`;
    } else if (str) {
      result += `<span class="text-emerald-700 dark:text-emerald-300 font-medium">${escapeHTML(str)}</span>`;
    } else if (keyword) {
      result += `<span class="text-success-700 dark:text-success-500 font-semibold">${escapeHTML(keyword)}</span>`;
    } else if (numBool) {
      result += `<span class="text-amber-700 dark:text-amber-300 font-mono">${escapeHTML(numBool)}</span>`;
    } else if (method) {
      result += `<span class="text-sky-700 dark:text-sky-300 font-medium">${escapeHTML(method)}</span>`;
    } else {
      result += escapeHTML(fullMatch);
    }
  }

  result += escapeHTML(code.slice(lastIndex));
  return result;
}

export function highlightCodeLine(codeLine: string): string {
  if (!codeLine) return '';

  const isTarget = codeLine.startsWith('>');
  const pipeIdx = codeLine.indexOf('|');

  let prefixHtml = '';
  let codePart: string;

  if (pipeIdx !== -1) {
    const rawPrefix = codeLine.slice(0, pipeIdx + 1);
    codePart = codeLine.slice(pipeIdx + 1);

    if (isTarget) {
      const lineNo = rawPrefix.slice(1, pipeIdx).trim();
      prefixHtml = `<span class="inline-flex items-center gap-1 font-bold text-emerald-700 dark:text-emerald-400"><span class="flex h-3.5 w-3.5 items-center justify-center rounded bg-emerald-600 dark:bg-emerald-500 text-[9px] text-white font-black shadow-xs">▶</span>${lineNo.padStart(4, ' ')} |</span>`;
    } else {
      const lineNo = rawPrefix.slice(0, pipeIdx).trim();
      prefixHtml = `<span class="text-slate-500/70 dark:text-text-muted/60 font-mono">${lineNo.padStart(5, ' ')} |</span>`;
    }
  } else {
    codePart = codeLine;
  }

  const highlightedCode = highlightJsTokens(codePart);

  if (isTarget) {
    return `<div class="flex items-center gap-2 bg-emerald-500/10 dark:bg-emerald-500/20 border-l-3 border-emerald-600 dark:border-emerald-500 px-2 py-1 rounded-r shadow-xs font-mono text-[11px] leading-relaxed my-0.5">${prefixHtml} <span>${highlightedCode}</span></div>`;
  }

  return `<div class="flex items-center gap-2 px-2 py-0.5 font-mono text-[11px] leading-relaxed">${prefixHtml} <span>${highlightedCode}</span></div>`;
}

export function highlightCodeSnippet(snippet: string): string {
  if (!snippet) return '';
  return snippet
    .split(/\r?\n/)
    .map((line) => highlightCodeLine(line))
    .join('');
}

export function convertPlaywrightSteps(
  pwSteps: PwTestStep[],
  fsModule?: FsModule | null
): TestStep[] {
  const activeFs = fsModule || getNodeFs();
  return pwSteps.map((step) => {
    const rawStep = step as unknown as Record<string, unknown>;
    const rawError = step.error as unknown as Record<string, unknown> | undefined;

    const error: TestStep['error'] = step.error
      ? {
          name: 'Error',
          message: step.error.message ?? '',
          stack: step.error.stack || '',
          location: step.error.location
            ? {
                file: step.error.location.file,
                line: step.error.location.line,
                column: step.error.location.column,
              }
            : null,
          snippet: step.error.snippet || '',
          cause: (rawError?.cause as TestError | null) || null,
        }
      : null;

    const status: TestStep['status'] = step.error ? 'failed' : 'passed';

    const location: Location | null = step.location
      ? {
          file: step.location.file,
          line: step.location.line,
          column: step.location.column,
        }
      : null;

    const snippet: string | undefined =
      (typeof rawStep.snippet === 'string' ? rawStep.snippet : undefined) ||
      getStepCodeSnippet(location, activeFs);

    const rawParams = rawStep.params;
    const params =
      rawParams && typeof rawParams === 'object'
        ? (rawParams as Record<string, unknown>)
        : undefined;

    return {
      title: step.title,
      subtitle: typeof rawStep.subtitle === 'string' ? rawStep.subtitle : undefined,
      location,
      snippet,
      params,
      duration: step.duration,
      status,
      annotations: Array.isArray(rawStep.annotations) ? rawStep.annotations : [],
      attachments: step.attachments
        ? step.attachments.map((att) => {
            let bodyData: string | null = null;
            if (att.body) {
              bodyData = Buffer.isBuffer(att.body)
                ? att.body.toString('base64')
                : typeof att.body === 'string'
                  ? att.body
                  : Buffer.from(att.body).toString('base64');
            } else if (att.path) {
              if (activeFs && activeFs.existsSync(att.path)) {
                try {
                  bodyData = activeFs.readFileSync(att.path).toString('base64');
                } catch {
                  // Ignore if cannot be read
                }
              }
            }
            return {
              name: att.name,
              contentType: att.contentType,
              path: att.path || null,
              body: bodyData,
            };
          })
        : [],
      error,
      subSteps:
        step.steps && step.steps.length > 0
          ? convertPlaywrightSteps(step.steps, activeFs)
          : undefined,
    };
  });
}

export function sanitizeAnsi(str: string): string {
  // eslint-disable-next-line no-control-regex
  return str.replace(/\x1b\[[0-9;]*m/g, '');
}

export function parseAnsiToHtml(str: string): string {
  if (!str) return '';

  const ansiColorMap: Record<number, string> = {
    30: 'color: var(--color-text-body-mid)', // dark gray / ink
    31: 'color: var(--color-danger-500)', // red
    32: 'color: var(--color-success-500)', // green
    33: 'color: var(--color-warning-500)', // yellow
    34: 'color: var(--color-info-500)', // blue
    35: 'color: var(--color-accent-gold)', // magenta / gold
    36: 'color: var(--color-info-500)', // cyan
    37: 'color: var(--color-text-muted-soft)', // white / soft text
    90: 'color: var(--color-text-muted)', // bright black / gray
    91: 'color: var(--color-danger-500)', // bright red
    92: 'color: var(--color-success-500)', // bright green
    93: 'color: var(--color-warning-500)', // bright yellow
    94: 'color: var(--color-info-500)', // bright blue
    95: 'color: var(--color-accent-gold)', // bright magenta / gold
    96: 'color: var(--color-info-500)', // bright cyan
    97: 'color: var(--color-text-ink)', // bright white
  };

  const styleMap: Record<number, string> = {
    1: 'font-weight: bold',
    2: 'opacity: 0.7',
    3: 'font-style: italic',
    4: 'text-decoration: underline',
  };

  let openSpans = 0;
  // eslint-disable-next-line no-control-regex
  const result = escapeHTML(str).replace(/\x1b\[([0-9;]*)m/g, (_, p1) => {
    if (!p1 || p1 === '0') {
      const closing = '</span>'.repeat(openSpans);
      openSpans = 0;
      return closing;
    }

    const codes = p1.split(';').map(Number);
    const styles: string[] = [];

    for (const code of codes) {
      if (code === 0) {
        // Reset handled below
      } else if (ansiColorMap[code]) {
        styles.push(ansiColorMap[code]);
      } else if (styleMap[code]) {
        styles.push(styleMap[code]);
      }
    }

    if (styles.length > 0) {
      openSpans++;
      return `<span style="${styles.join('; ')}">`;
    }

    return '';
  });

  return result + '</span>'.repeat(openSpans);
}

export function highlightExpectedReceived(str: string): string {
  if (!str) return '';
  const parsed = parseAnsiToHtml(str);
  return parsed
    .replace(
      /(Expected:?\s*)([^\n<]+)/g,
      (_, p1, p2) => `${p1}<span class="text-success-500 font-bold">${p2}</span>`
    )
    .replace(
      /(Received:?\s*)([^\n<]+)/g,
      (_, p1, p2) => `${p1}<span class="text-danger-500 font-bold">${p2}</span>`
    );
}

export function escapeHTML(html: string): string {
  return html
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function buildHierarchyForFile(fileName: string, cases: TestCase[]): TestSuite {
  const rootSuite: TestSuite = {
    title: fileName,
    cases: [],
    subSuites: [],
  };

  for (const tc of cases) {
    const describePath =
      tc.describePath || (tc.parent && tc.parent !== tc.fileName ? [tc.parent] : []);
    let currentSuite = rootSuite;

    for (const title of describePath) {
      if (!currentSuite.subSuites) {
        currentSuite.subSuites = [];
      }
      let child = currentSuite.subSuites.find((s) => s.title === title);
      if (!child) {
        child = { title, cases: [], subSuites: [] };
        currentSuite.subSuites.push(child);
      }
      currentSuite = child;
    }

    currentSuite.cases.push(tc);
  }

  return rootSuite;
}

export function buildSuitesFromCases(testCases: TestCase[]): TestSuite[] {
  const fileGroups: Record<string, TestCase[]> = {};

  for (const tc of testCases) {
    const key = tc.fileName || 'unknown file';
    if (!fileGroups[key]) fileGroups[key] = [];
    fileGroups[key].push(tc);
  }

  const suites: TestSuite[] = [];
  for (const [fileName, cases] of Object.entries(fileGroups)) {
    suites.push(buildHierarchyForFile(fileName, cases));
  }

  return suites;
}

export function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (minutes > 0) return `${minutes}m ${secs}s`;
  return `${secs}s`;
}

export function formatDurationVerbose(ms: number): string {
  if (ms >= 1000) return `${(ms / 1000).toFixed(1)}s`;
  return `${ms}ms`;
}

export function formatDate(iso: string): string {
  const d = new Date(iso);
  return (
    d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }) +
    ' · ' +
    d.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      timeZoneName: 'short',
    })
  );
}

/**
 * Format a start and end ISO timestamp into a smart, non-repetitive date-time range string.
 * e.g., "Sep 20, 2026 • 05:38:12 AM – 05:40:26 AM IST" (for same-day runs)
 */
export function formatDateRange(startIso: string, endIso?: string): string {
  if (!startIso) return '';
  const start = new Date(startIso);
  if (isNaN(start.getTime())) return startIso;

  if (!endIso) {
    return formatDate(startIso);
  }

  const end = new Date(endIso);
  if (isNaN(end.getTime())) {
    return formatDate(startIso);
  }

  const startDateStr = start.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
  const endDateStr = end.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  const startTimeStr = start.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
  const endTimeStr = end.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    timeZoneName: 'short',
  });

  if (startDateStr === endDateStr) {
    return `${startDateStr}  •  ${startTimeStr} – ${endTimeStr}`;
  }

  const startTimeShort = start.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });

  return `${startDateStr}, ${startTimeShort} – ${endDateStr}, ${endTimeStr}`;
}

/**
 * Split an ISO timestamp into a human-readable date line ("Sep 18, 2026")
 * and an AM/PM time line ("04:57 AM"). No time zone, for two-line chart labels.
 */
export function formatDateParts(iso: string): [string, string] {
  const d = new Date(iso);
  const date = d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
  const time = d.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });
  return [date, time];
}

export interface FailedTest {
  title: string;
  suiteTitle: string;
  fileName: string;
  duration: number;
  type: string;
  tags?: string[];
  errors: TestError[];
  testCase: TestCase;
}

export function extractFailedTests(suites: TestSuite[]): FailedTest[] {
  const results: FailedTest[] = [];

  function processSuiteForFailures(suite: TestSuite, parentTitle: string) {
    for (const testCase of suite.cases) {
      if (
        testCase.status === 'failed' ||
        testCase.status === 'timedOut' ||
        testCase.status === 'interrupted'
      ) {
        results.push({
          title: testCase.title,
          suiteTitle: parentTitle,
          fileName: testCase.fileName,
          duration: testCase.duration,
          type:
            testCase.status === 'timedOut'
              ? 'Timed Out'
              : testCase.status === 'interrupted'
                ? 'Interrupted'
                : 'Failed',
          tags: testCase.tags?.map((tag) => tag.replace('@', '')),
          errors: testCase.errors || [],
          testCase,
        });
      }
    }

    for (const sub of suite.subSuites || []) {
      processSuiteForFailures(sub, `${parentTitle} > ${sub.title}`);
    }
  }

  for (const suite of suites) {
    processSuiteForFailures(suite, suite.title);
  }

  return results;
}

export function collectAllCases(suites: TestSuite[]): TestCase[] {
  const cases: TestCase[] = [];
  for (const suite of suites) {
    cases.push(...suite.cases);
    if (suite.subSuites && suite.subSuites.length > 0) {
      cases.push(...collectAllCases(suite.subSuites));
    }
  }
  return cases;
}

export interface ProjectStats {
  name: string;
  total: number;
  passed: number;
  failed: number;
  skipped: number;
  timedOut: number;
  interrupted: number;
  passRate: number;
  flakyCount: number;
  flakyRate: number;
  totalDuration: number;
  avgDuration: number;
  p95Duration: number;
  medianDuration: number;
  minDuration: number;
  maxDuration: number;
  uniqueFiles: number;
  uniqueTagsCount: number;
  speedMultiplier: number;
  cases: TestCase[];
}

export interface ProjectExecutiveKPIs {
  totalProjects: number;
  mostStableProject: { name: string; passRate: number; total: number } | null;
  slowestProject: { name: string; totalDuration: number; avgDuration: number } | null;
  passRateParityDelta: number;
  totalFlakyCount: number;
  overallAvgDuration: number;
}

export function computeProjectStats(allCases: TestCase[]): ProjectStats[] {
  const projectCasesMap = new Map<string, TestCase[]>();

  for (const tc of allCases) {
    const proj = tc.project || 'default';
    if (!projectCasesMap.has(proj)) {
      projectCasesMap.set(proj, []);
    }
    projectCasesMap.get(proj)!.push(tc);
  }

  const executedAllCases = allCases.filter((tc) => tc.status !== 'skipped');
  const overallTotalDuration = executedAllCases.reduce((acc, tc) => acc + tc.duration, 0);
  const overallAvgDuration =
    executedAllCases.length > 0 ? overallTotalDuration / executedAllCases.length : 0;

  const result: ProjectStats[] = [];

  for (const [name, cases] of projectCasesMap.entries()) {
    let passed = 0;
    let failed = 0;
    let skipped = 0;
    let timedOut = 0;
    let interrupted = 0;
    let flakyCount = 0;

    const fileSet = new Set<string>();
    const tagSet = new Set<string>();

    for (const tc of cases) {
      if (tc.fileName) fileSet.add(tc.fileName);
      for (const tag of tc.tags || []) {
        tagSet.add(tag);
      }

      const isFlaky =
        (tc.attempts !== undefined && tc.attempts > 1) ||
        (tc.failedAttempts !== undefined && tc.failedAttempts.length > 0);
      if (isFlaky) {
        flakyCount++;
      }

      switch (tc.status) {
        case 'passed':
          passed++;
          break;
        case 'failed':
          failed++;
          break;
        case 'skipped':
          skipped++;
          break;
        case 'timedOut':
          timedOut++;
          break;
        case 'interrupted':
          interrupted++;
          break;
      }
    }

    const total = cases.length;
    const passRate = total > 0 ? Math.round((passed / total) * 100) : 0;
    const flakyRate = total > 0 ? Math.round((flakyCount / total) * 100) : 0;

    const executedCases = cases.filter((tc) => tc.status !== 'skipped');
    const durations = executedCases.map((tc) => tc.duration).sort((a, b) => a - b);
    const totalDuration = cases.reduce((acc, tc) => acc + tc.duration, 0);
    const avgDuration =
      executedCases.length > 0 ? Math.round(totalDuration / executedCases.length) : 0;

    let minDuration = 0;
    let maxDuration = 0;
    let medianDuration = 0;
    let p95Duration = 0;

    if (durations.length > 0) {
      minDuration = durations[0];
      maxDuration = durations[durations.length - 1];

      const len = durations.length;
      if (len % 2 === 1) {
        medianDuration = durations[Math.floor(len / 2)];
      } else {
        medianDuration = Math.round((durations[len / 2 - 1] + durations[len / 2]) / 2);
      }

      const p95Idx = Math.min(len - 1, Math.max(0, Math.ceil(0.95 * len) - 1));
      p95Duration = durations[p95Idx];
    }

    const speedMultiplier =
      overallAvgDuration > 0 && avgDuration > 0
        ? Math.round((avgDuration / overallAvgDuration) * 10) / 10
        : 1.0;

    result.push({
      name,
      total,
      passed,
      failed,
      skipped,
      timedOut,
      interrupted,
      passRate,
      flakyCount,
      flakyRate,
      totalDuration,
      avgDuration,
      p95Duration,
      medianDuration,
      minDuration,
      maxDuration,
      uniqueFiles: fileSet.size,
      uniqueTagsCount: tagSet.size,
      speedMultiplier,
      cases,
    });
  }

  return result;
}

export function computeProjectExecutiveKPIs(projectStats: ProjectStats[]): ProjectExecutiveKPIs {
  if (projectStats.length === 0) {
    return {
      totalProjects: 0,
      mostStableProject: null,
      slowestProject: null,
      passRateParityDelta: 0,
      totalFlakyCount: 0,
      overallAvgDuration: 0,
    };
  }

  let mostStable = projectStats[0];
  let slowest = projectStats[0];
  let maxPassRate = projectStats[0].passRate;
  let minPassRate = projectStats[0].passRate;
  let totalFlaky = 0;
  let combinedTotalDuration = 0;
  let combinedTotalExecuted = 0;

  for (const proj of projectStats) {
    totalFlaky += proj.flakyCount;
    combinedTotalDuration += proj.totalDuration;
    combinedTotalExecuted += proj.total - proj.skipped;

    if (proj.passRate > maxPassRate) maxPassRate = proj.passRate;
    if (proj.passRate < minPassRate) minPassRate = proj.passRate;

    if (
      proj.passRate > mostStable.passRate ||
      (proj.passRate === mostStable.passRate && proj.flakyRate < mostStable.flakyRate) ||
      (proj.passRate === mostStable.passRate &&
        proj.flakyRate === mostStable.flakyRate &&
        proj.total > mostStable.total)
    ) {
      mostStable = proj;
    }

    if (proj.totalDuration > slowest.totalDuration) {
      slowest = proj;
    }
  }

  const passRateParityDelta = maxPassRate - minPassRate;
  const overallAvgDuration =
    combinedTotalExecuted > 0 ? Math.round(combinedTotalDuration / combinedTotalExecuted) : 0;

  return {
    totalProjects: projectStats.length,
    mostStableProject: {
      name: mostStable.name,
      passRate: mostStable.passRate,
      total: mostStable.total,
    },
    slowestProject: {
      name: slowest.name,
      totalDuration: slowest.totalDuration,
      avgDuration: slowest.avgDuration,
    },
    passRateParityDelta,
    totalFlakyCount: totalFlaky,
    overallAvgDuration,
  };
}

export function computePassRate(summary: ResultSummary): number {
  if (summary.total === 0) return 0;
  return Math.round((summary.passed / summary.total) * 100);
}

export function computeSlowestTest(allCases: TestCase[]): number {
  if (allCases.length === 0) return 0;
  return Math.max(...allCases.map((tc) => tc.duration));
}

export function computeFastestTest(allCases: TestCase[]): number {
  const executedCases = allCases.filter((tc) => tc.status !== 'skipped');
  if (executedCases.length === 0) return 0;
  return Math.min(...executedCases.map((tc) => tc.duration));
}

export function getTotalTags(allCases: TestCase[]): number {
  const tagSet = new Set<string>();
  for (const tc of allCases) {
    for (const tag of tc.tags || []) {
      tagSet.add(tag);
    }
  }
  return tagSet.size;
}

export interface FileStats {
  fileName: string;
  total: number;
  passed: number;
  failed: number;
  skipped: number;
  timedOut: number;
  interrupted: number;
  totalDuration: number;
  avgDuration: number;
  flakyCount: number;
}

export function computeFileStats(allCases: TestCase[]): FileStats[] {
  const fileMap = new Map<string, FileStats>();

  for (const tc of allCases) {
    const file = tc.fileName || 'unknown file';
    if (!fileMap.has(file)) {
      fileMap.set(file, {
        fileName: file,
        total: 0,
        passed: 0,
        failed: 0,
        skipped: 0,
        timedOut: 0,
        interrupted: 0,
        totalDuration: 0,
        avgDuration: 0,
        flakyCount: 0,
      });
    }
    const stats = fileMap.get(file)!;
    stats.total++;
    stats.totalDuration += tc.duration || 0;

    const isFlaky =
      (tc.attempts !== undefined && tc.attempts > 1) ||
      (tc.failedAttempts !== undefined && tc.failedAttempts.length > 0);
    if (isFlaky) {
      stats.flakyCount++;
    }

    switch (tc.status) {
      case 'passed':
        stats.passed++;
        break;
      case 'failed':
        stats.failed++;
        break;
      case 'skipped':
        stats.skipped++;
        break;
      case 'timedOut':
        stats.timedOut++;
        break;
      case 'interrupted':
        stats.interrupted++;
        break;
    }
  }

  for (const stats of fileMap.values()) {
    const executed = stats.total - stats.skipped;
    stats.avgDuration = executed > 0 ? Math.round(stats.totalDuration / executed) : 0;
  }

  return Array.from(fileMap.values()).sort((a, b) => b.total - a.total);
}

export function truncateFileName(fileName: string, maxLength: number = 40): string {
  if (fileName.length <= maxLength) return fileName;
  const extensionIndex = fileName.lastIndexOf('.');
  const extension = extensionIndex !== -1 ? fileName.slice(extensionIndex) : '';
  const nameWithoutExt = extensionIndex !== -1 ? fileName.slice(0, extensionIndex) : fileName;
  const availableNameLength = maxLength - extension.length - 3; // reserve 3 chars for '...'
  if (availableNameLength <= 1) {
    const stemStart = nameWithoutExt.slice(0, Math.max(1, availableNameLength + 3));
    return `${stemStart}...${extension}`;
  }
  const halfLen = Math.floor(availableNameLength / 2);
  const start = nameWithoutExt.slice(0, halfLen + (availableNameLength % 2));
  const end = nameWithoutExt.slice(-halfLen);
  return `${start}...${end}${extension}`;
}

/**
 * Normalizes error messages and stack traces by masking dynamic tokens (timestamps,
 * pointers, line numbers, ports, durations) so identical failure causes yield the same signature.
 */
export function normalizeErrorText(message: string, stack: string): string {
  const normMsg = (message || '')
    .replace(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z?/gi, '<TIMESTAMP>')
    .replace(/0x[a-fA-F0-9]+/g, '<PTR>')
    .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, '<UUID>')
    .replace(/localhost:\d+/g, '<HOST>')
    .replace(/\d+ms/gi, '<DURATION>')
    .replace(/:\d+:\d+/g, ':<LINE>:<COL>');

  const normStack = (stack || '')
    .split('\n')
    .filter((line) => !line.includes('node_modules') && !line.includes('internal/'))
    .slice(0, 4)
    .join('\n')
    .replace(/:\d+:\d+/g, ':<LINE>:<COL>');

  return `${normMsg.trim()}\n${normStack.trim()}`;
}

/**
 * Synchronous SHA-256 hash generator for string inputs.
 */
export function sha256Sync(str: string): string {
  function rightRotate(value: number, amount: number) {
    return (value >>> amount) | (value << (32 - amount));
  }

  const mathPow = Math.pow;
  const maxWord = mathPow(2, 32);
  const hash: number[] = [];
  const k: number[] = [];
  let primeCounter = 0;

  const isComposite: Record<number, boolean> = {};
  for (let candidate = 2; primeCounter < 64; candidate++) {
    if (!isComposite[candidate]) {
      for (let i = 0; i < 313; i += candidate) {
        isComposite[i] = true;
      }
      if (primeCounter < 8) {
        hash[primeCounter] = (mathPow(candidate, 1 / 2) * maxWord) | 0;
      }
      k[primeCounter] = (mathPow(candidate, 1 / 3) * maxWord) | 0;
      primeCounter++;
    }
  }

  let wordsStr = str + '\x80';
  while ((wordsStr.length % 64) - 56) wordsStr += '\x00';

  const words: number[] = [];
  const asciiBitLength = str.length * 8;

  for (let i = 0; i < wordsStr.length; i++) {
    const charCode = wordsStr.charCodeAt(i);
    words[i >> 2] |= charCode << (((3 - i) % 4) * 8);
  }
  words[words.length] = (asciiBitLength / maxWord) | 0;
  words[words.length] = asciiBitLength;

  for (let j = 0; j < words.length;) {
    const w = words.slice(j, (j += 16));
    const oldHash = hash.slice(0);

    for (let i = 0; i < 64; i++) {
      const w15 = w[i - 15],
        w2 = w[i - 2];
      const a = hash[0],
        e = hash[4];
      const temp1 =
        hash[7] +
        (rightRotate(e, 6) ^ rightRotate(e, 11) ^ rightRotate(e, 25)) +
        ((e & hash[5]) ^ (~e & hash[6])) +
        k[i] +
        (w[i] =
          i < 16
            ? w[i]
            : (w[i - 16] +
                (rightRotate(w15, 7) ^ rightRotate(w15, 18) ^ (w15 >>> 3)) +
                w[i - 7] +
                (rightRotate(w2, 17) ^ rightRotate(w2, 19) ^ (w2 >>> 10))) |
              0);
      const temp2 =
        (rightRotate(a, 2) ^ rightRotate(a, 13) ^ rightRotate(a, 22)) +
        ((a & hash[1]) ^ (a & hash[2]) ^ (hash[1] & hash[2]));

      hash[7] = hash[6];
      hash[6] = hash[5];
      hash[5] = hash[4];
      hash[4] = (hash[3] + temp1) | 0;
      hash[3] = hash[2];
      hash[2] = hash[1];
      hash[1] = hash[0];
      hash[0] = (temp1 + temp2) | 0;
    }

    for (let i = 0; i < 8; i++) {
      hash[i] = (hash[i] + oldHash[i]) | 0;
    }
  }

  let result = '';
  for (let i = 0; i < 8; i++) {
    for (let j = 3; j >= 0; j--) {
      const b = (hash[i] >> (j * 8)) & 255;
      result += (b < 16 ? '0' : '') + b.toString(16);
    }
  }
  return result;
}

export interface ErrorSignatureDetails {
  hash: string;
  shortHash: string;
  representativeMessage: string;
}

export function getErrorSignature(test: FailedTest): ErrorSignatureDetails {
  const err = test.errors?.[0];
  const msg = err?.message || test.type || 'Unknown Failure';
  const stack = err?.stack || '';
  const normalized = normalizeErrorText(msg, stack);
  const hash =
    sha256Sync(normalized) || 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';
  return {
    hash,
    shortHash: `sha256:${hash.slice(0, 8)}`,
    representativeMessage: msg.split('\n')[0],
  };
}
