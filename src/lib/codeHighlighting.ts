import type { TestStep as PwTestStep } from '@playwright/test/reporter';
import type { existsSync as fsExistsSync, readFileSync as fsReadFileSync } from 'fs';
import { escapeHTML } from './formatters';
import type { Location, TestError, TestStep } from './types/report';

export interface FsModule {
  existsSync: typeof fsExistsSync;
  readFileSync: typeof fsReadFileSync;
}

let customFsInstance: FsModule | null = null;
const fileSnippetCache = new Map<string, string[]>();

const ANSI_COLOR_MAP: Record<number, string> = {
  30: 'color: #94a3b8',
  31: 'color: #f87171',
  32: 'color: #4ade80',
  33: 'color: #fbbf24',
  34: 'color: #60a5fa',
  35: 'color: #c084fc',
  36: 'color: #38bdf8',
  37: 'color: #f8fafc',
  90: 'color: #94a3b8',
  91: 'color: #f87171',
  92: 'color: #4ade80',
  93: 'color: #fbbf24',
  94: 'color: #60a5fa',
  95: 'color: #c084fc',
  96: 'color: #38bdf8',
  97: 'color: #ffffff',
};

const ANSI_STYLE_MAP: Record<number, string> = {
  1: 'font-weight: bold',
  2: 'opacity: 0.7',
  3: 'font-style: italic',
  4: 'text-decoration: underline',
};

/**
 * Sets a custom file system instance (useful when running under Node or bundled environments).
 *
 * @param fsInstance - File system module instance or null.
 */
export function setFsModule(fsInstance: FsModule | null): void {
  customFsInstance = fsInstance;
}

/**
 * Attempts to resolve Node.js `fs` module in Node environment or fallback to custom instance.
 * Returns null when executing in browser runtime.
 *
 * @returns Resolved FsModule instance or null.
 */
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

/**
 * Extracts a 3-line code snippet around a target source location line from disk.
 *
 * @param location - Source code location with file path, line, and column.
 * @param fsModule - Optional file system module override.
 * @returns Formatted 3-line snippet string with line number prefixes and target indicator, or undefined.
 */
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

/**
 * Applies syntax highlighting span tags for JavaScript/TypeScript tokens.
 *
 * @param code - Raw code string.
 * @returns HTML string with syntax highlighting spans.
 */
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
      result += `<span class="text-purple-700 dark:text-purple-400 font-semibold">${escapeHTML(keyword)}</span>`;
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

/**
 * Applies syntax highlighting for a JSON line (keys, string values, numbers, booleans, null, punctuation).
 *
 * @param line - Raw line of JSON text.
 * @returns HTML string with syntax highlighting spans.
 */
export function highlightJsonLine(line: string): string {
  if (!line) return '';

  // Matches:
  // 1: JSON Key ("key"\s*:)
  // 2: JSON String value ("(?:\\.|[^"\\])*")
  // 3: Number or boolean or null (\b(?:true|false|null|-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)\b)
  // 4: Brackets / punctuation ([{}[\]:,])
  const regex =
    /("(?:\\.|[^"\\])*"(?=\s*:))|("(?:\\.|[^"\\])*")|(\b(?:true|false|null|-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)\b)|([{}[\]:,])/g;

  let result = '';
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(line)) !== null) {
    result += escapeHTML(line.slice(lastIndex, match.index));
    lastIndex = regex.lastIndex;

    const [fullMatch, key, strVal, litVal, punct] = match;

    if (key) {
      result += `<span class="text-sky-700 dark:text-sky-300 font-semibold">${escapeHTML(key)}</span>`;
    } else if (strVal) {
      result += `<span class="text-emerald-700 dark:text-emerald-300 font-medium">${escapeHTML(strVal)}</span>`;
    } else if (litVal) {
      result += `<span class="text-amber-700 dark:text-amber-300 font-mono">${escapeHTML(litVal)}</span>`;
    } else if (punct) {
      result += `<span class="text-slate-500 dark:text-slate-400 font-medium">${escapeHTML(punct)}</span>`;
    } else {
      result += escapeHTML(fullMatch);
    }
  }

  result += escapeHTML(line.slice(lastIndex));
  return result;
}

/**
 * Applies syntax highlighting for a line of Markdown (headers, code blocks, quotes, lists, bold/italic, links).
 *
 * @param line - Raw line of Markdown text.
 * @returns HTML string with syntax highlighting spans.
 */
export function highlightMarkdownLine(line: string): string {
  if (!line) return '';

  // 1. Code fences
  if (/^```/.test(line)) {
    return `<span class="text-purple-700 dark:text-purple-400 font-bold font-mono">${escapeHTML(line)}</span>`;
  }

  // 2. Headings (# Header)
  const headingMatch = line.match(/^(\s{0,3}#{1,6}\s+)(.*)$/);
  if (headingMatch) {
    return `<span class="text-purple-700 dark:text-purple-400 font-bold">${escapeHTML(headingMatch[1])}</span><span class="text-accent-blue font-bold">${escapeHTML(headingMatch[2])}</span>`;
  }

  // 3. Blockquotes (> quote)
  const quoteMatch = line.match(/^(\s{0,3}>\s*)(.*)$/);
  if (quoteMatch) {
    return `<span class="text-slate-500 dark:text-slate-400 font-bold">${escapeHTML(quoteMatch[1])}</span><span class="text-slate-600 dark:text-slate-300 italic">${highlightMarkdownInlines(quoteMatch[2])}</span>`;
  }

  // 4. Bullet & numbered lists (- item, * item, 1. item)
  const listMatch = line.match(/^(\s{0,4}(?:[-*+]|\d+\.)\s+)(.*)$/);
  if (listMatch) {
    return `<span class="text-amber-700 dark:text-amber-400 font-bold">${escapeHTML(listMatch[1])}</span>${highlightMarkdownInlines(listMatch[2])}`;
  }

  return highlightMarkdownInlines(line);
}

/**
 * Highlights inline Markdown tokens: backticks, bold/italic, links.
 *
 * @param text - Text without block-level prefixes.
 * @returns HTML string with inline formatting spans.
 */
function highlightMarkdownInlines(text: string): string {
  if (!text) return '';

  // Matches:
  // 1: Inline code (`...`)
  // 2: Bold / Italic (**...** or *...*)
  // 3: Markdown link [label](url)
  const regex = /(`[^`\n]+`)|(\*{1,3}[^*\n]+\*{1,3}|_{1,3}[^_\n]+_{1,3})|(\[[^\]]+\]\([^)]+\))/g;

  let result = '';
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    result += escapeHTML(text.slice(lastIndex, match.index));
    lastIndex = regex.lastIndex;

    const [fullMatch, code, boldItalic, link] = match;

    if (code) {
      result += `<span class="text-purple-700 dark:text-purple-300 bg-surface-200/60 dark:bg-surface-200/20 px-1 rounded font-mono">${escapeHTML(code)}</span>`;
    } else if (boldItalic) {
      result += `<span class="text-text-ink dark:text-text-on-primary font-bold">${escapeHTML(boldItalic)}</span>`;
    } else if (link) {
      result += `<span class="text-accent-blue underline">${escapeHTML(link)}</span>`;
    } else {
      result += escapeHTML(fullMatch);
    }
  }

  result += escapeHTML(text.slice(lastIndex));
  return result;
}

/**
 * Detects language from filename or contentType.
 *
 * @param fileName - File or title string.
 * @param contentType - Optional MIME type string.
 * @returns Language identifier ('json' | 'markdown' | 'javascript' | 'typescript' | 'html' | 'css' | 'plain')
 */
export function detectLanguage(fileName?: string, contentType?: string): string {
  const name = (fileName || '').toLowerCase();
  const mime = (contentType || '').toLowerCase();

  if (name.endsWith('.json') || mime.includes('json')) return 'json';
  if (name.endsWith('.md') || name.endsWith('.markdown') || mime.includes('markdown'))
    return 'markdown';
  if (name.endsWith('.ts') || name.endsWith('.tsx') || mime.includes('typescript'))
    return 'typescript';
  if (
    name.endsWith('.js') ||
    name.endsWith('.jsx') ||
    name.endsWith('.mjs') ||
    name.endsWith('.cjs') ||
    mime.includes('javascript')
  )
    return 'javascript';
  if (name.endsWith('.html') || name.endsWith('.htm') || mime.includes('html')) return 'html';
  if (name.endsWith('.css') || mime.includes('css')) return 'css';

  return 'plain';
}

/**
 * Dispatches line syntax highlighting according to language.
 *
 * @param line - Raw line text.
 * @param language - Target language ('json' | 'markdown' | 'javascript' | 'typescript' | 'plain').
 * @returns Safe HTML string with syntax highlighting.
 */
export function highlightSyntaxLine(line: string, language?: string): string {
  if (!line) return '';

  switch (language) {
    case 'json':
      return highlightJsonLine(line);
    case 'markdown':
      return highlightMarkdownLine(line);
    case 'javascript':
    case 'typescript':
      return highlightJsTokens(line);
    default:
      return escapeHTML(line);
  }
}

/**
 * Renders a single code line into HTML with status indicators and syntax highlighting.
 *
 * @param codeLine - Code line string with optional prefix.
 * @param status - Step execution status.
 * @param lineNoWidth - Minimum width (padding) for line number column.
 * @returns HTML string for the code line.
 */
export function highlightCodeLine(codeLine: string, status?: string, lineNoWidth = 4): string {
  if (!codeLine) return '';

  const isTarget = codeLine.startsWith('>');
  const pipeIdx = codeLine.indexOf('|');

  if (pipeIdx !== -1) {
    const rawPrefix = codeLine.slice(0, pipeIdx);
    const lineNo = rawPrefix.replace('>', '').trim();
    const codePart = codeLine.slice(pipeIdx + 1);

    const isCaretLine = lineNo === '' && codePart.includes('^');
    const isFailedStatus =
      status === 'failed' || status === 'timedOut' || status === 'interrupted' || isCaretLine;
    const indicatorColorClass = isFailedStatus
      ? 'text-danger-600 dark:text-danger-400'
      : 'text-success-600 dark:text-success-400';

    const paddedLineNo = lineNo ? lineNo.padStart(lineNoWidth, ' ') : ' '.repeat(lineNoWidth);

    const gutterHtml = `<span class="inline-flex items-center shrink-0 select-none font-mono"><span class="w-3.5 shrink-0 inline-flex items-center justify-center font-black ${isTarget ? indicatorColorClass : 'invisible'}" aria-hidden="true">▶</span><span class="whitespace-pre font-mono ${isTarget ? `${indicatorColorClass} font-bold` : 'text-text-muted/70 dark:text-slate-500'}">${paddedLineNo}</span><span class="mx-2 font-mono ${isTarget ? `${indicatorColorClass} font-bold` : 'text-text-muted/70 dark:text-slate-500'}">|</span></span>`;

    const codeHtml = isCaretLine
      ? `<span class="whitespace-pre font-bold ${indicatorColorClass}">${escapeHTML(codePart)}</span>`
      : `<span class="whitespace-pre">${highlightJsTokens(codePart)}</span>`;

    return `<div class="flex items-center px-2 py-0.5 font-mono text-[12px] leading-relaxed min-w-fit">${gutterHtml}${codeHtml}</div>`;
  }

  return `<div class="flex items-center px-2 py-0.5 font-mono text-[12px] leading-relaxed min-w-fit"><span class="whitespace-pre">${highlightJsTokens(codeLine)}</span></div>`;
}

/**
 * Highlights a multi-line code snippet into syntax-colored HTML code blocks.
 *
 * @param snippet - Multi-line code snippet string.
 * @param status - Step execution status.
 * @returns Syntax highlighted HTML string.
 */
export function highlightCodeSnippet(snippet: string, status?: string): string {
  if (!snippet) return '';

  const lines = snippet.split(/\r?\n/);
  let maxLineNoWidth = 3;
  for (const line of lines) {
    const pipeIdx = line.indexOf('|');
    if (pipeIdx !== -1) {
      const lineNo = line.slice(0, pipeIdx).replace('>', '').trim();
      if (lineNo) {
        maxLineNoWidth = Math.max(maxLineNoWidth, lineNo.length);
      }
    }
  }

  return lines.map((line) => highlightCodeLine(line, status, maxLineNoWidth)).join('');
}

/**
 * Recursively converts Playwright step models into internal TestStep models with code snippets and attachments.
 *
 * @param pwSteps - Raw Playwright TestStep array.
 * @param fsModule - Optional file system module override.
 * @returns Array of normalized TestStep models.
 */
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

/**
 * Strips ANSI escape sequences (colors, font styles) from terminal output strings.
 *
 * @param str - String containing ANSI escape sequences.
 * @returns Clean string without ANSI control codes.
 */
export function sanitizeAnsi(str: string): string {
  // eslint-disable-next-line no-control-regex
  return str.replace(/\x1b\[[0-9;]*m/g, '');
}

/**
 * Parses ANSI terminal control sequences into styled HTML `<span>` elements.
 *
 * @param str - String containing ANSI escape sequences.
 * @returns HTML string with colored spans representing ANSI styles.
 */
export function parseAnsiToHtml(str: string): string {
  if (!str) return '';

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
      } else if (ANSI_COLOR_MAP[code]) {
        styles.push(ANSI_COLOR_MAP[code]);
      } else if (ANSI_STYLE_MAP[code]) {
        styles.push(ANSI_STYLE_MAP[code]);
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

/**
 * Highlights "Expected" vs "Received" assertion failure diff text in stack traces.
 *
 * @param str - Stack trace string.
 * @returns HTML string with colored Expected (green) and Received (red) spans.
 */
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
