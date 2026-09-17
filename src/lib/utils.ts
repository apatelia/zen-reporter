import type { TestStep as PwTestStep } from '@playwright/test/reporter';
import * as fs from 'fs';
import type { Location, ResultSummary, TestCase, TestError, TestStep, TestSuite } from './types';

export function getStepCodeSnippet(location: Location | null | undefined): string | undefined {
  if (!location || !location.file || !location.line) {
    return undefined;
  }

  try {
    if (
      typeof fs !== 'undefined' &&
      typeof fs.existsSync === 'function' &&
      fs.existsSync(location.file)
    ) {
      const content = fs.readFileSync(location.file, 'utf8');
      const lines = content.split(/\r?\n/);
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
    }
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
      result += `<span class="text-purple-700 dark:text-purple-300 font-semibold">${escapeHTML(keyword)}</span>`;
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

export function convertPlaywrightSteps(pwSteps: PwTestStep[]): TestStep[] {
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
      getStepCodeSnippet(location);

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
            let bodyData: Buffer | string | null = att.body || null;
            if (
              !bodyData &&
              att.path &&
              typeof fs !== 'undefined' &&
              typeof fs.existsSync === 'function' &&
              fs.existsSync(att.path)
            ) {
              try {
                bodyData = fs.readFileSync(att.path).toString('base64');
              } catch {
                // Ignore if cannot be read
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
        step.steps && step.steps.length > 0 ? convertPlaywrightSteps(step.steps) : undefined,
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
    30: 'color: #4b5563', // black
    31: 'color: #ef4444', // red
    32: 'color: #22c55e', // green
    33: 'color: #eab308', // yellow
    34: 'color: #3b82f6', // blue
    35: 'color: #a855f7', // magenta
    36: 'color: #06b6d4', // cyan
    37: 'color: #f3f4f6', // white
    90: 'color: #6b7280', // bright black / gray
    91: 'color: #f87171', // bright red
    92: 'color: #4ade80', // bright green
    93: 'color: #facc15', // bright yellow
    94: 'color: #60a5fa', // bright blue
    95: 'color: #c084fc', // bright magenta
    96: 'color: #22d3ee', // bright cyan
    97: 'color: #ffffff', // bright white
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
      (_, p1, p2) => `${p1}<span class="text-[#4ade80] font-bold">${p2}</span>`
    )
    .replace(
      /(Received:?\s*)([^\n<]+)/g,
      (_, p1, p2) => `${p1}<span class="text-[#f87171] font-bold">${p2}</span>`
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
  passed: number;
  failed: number;
  skipped: number;
  timedOut: number;
  interrupted: number;
}

export function computeProjectStats(allCases: TestCase[]): ProjectStats[] {
  const projectMap = new Map<string, ProjectStats>();

  for (const tc of allCases) {
    const project = tc.project;
    if (!projectMap.has(project)) {
      projectMap.set(project, {
        name: project,
        passed: 0,
        failed: 0,
        skipped: 0,
        timedOut: 0,
        interrupted: 0,
      });
    }
    const stats = projectMap.get(project)!;
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

  return Array.from(projectMap.values());
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
}

export function computeFileStats(allCases: TestCase[]): FileStats[] {
  const fileMap = new Map<string, FileStats>();

  for (const tc of allCases) {
    const file = tc.fileName;
    if (!fileMap.has(file)) {
      fileMap.set(file, {
        fileName: file,
        total: 0,
        passed: 0,
        failed: 0,
        skipped: 0,
        timedOut: 0,
        interrupted: 0,
      });
    }
    const stats = fileMap.get(file)!;
    stats.total++;
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

  return Array.from(fileMap.values()).sort((a, b) => b.total - a.total);
}

export function truncateFileName(fileName: string, maxLength: number = 40): string {
  if (fileName.length <= maxLength) return fileName;
  const extensionIndex = fileName.lastIndexOf('.');
  const extension = extensionIndex !== -1 ? fileName.slice(extensionIndex) : '';
  const nameWithoutExt = extensionIndex !== -1 ? fileName.slice(0, extensionIndex) : fileName;
  const availableNameLength = maxLength - extension.length;
  if (availableNameLength <= 6) {
    return '...' + fileName.slice(maxLength - 3);
  }
  const halfLen = Math.floor(availableNameLength / 2);
  return nameWithoutExt.slice(0, halfLen) + '...' + nameWithoutExt.slice(-halfLen) + extension;
}
