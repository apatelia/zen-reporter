import { existsSync, readFileSync } from 'fs';
import { dirname, isAbsolute, resolve } from 'path';
import type { Plugin } from 'vite';

export interface InjectReportDataOptions {
  /** Optional explicit path to the report.json data file. */
  dataFile?: string;
  /** When true, skips data injection to produce a clean, data-free template bundle. */
  skip?: boolean;
}

/**
 * Vite plugin that injects `report.json` and optional `history.json` payloads
 * directly into the `<head>` of the built index.html as JSON script tags.
 *
 * @param options - Configuration options controlling data file paths and skip flags.
 * @returns Configured Vite plugin object for index.html transformation.
 */
export function injectReportData(options: InjectReportDataOptions = {}): Plugin {
  const envOutput = process.env.PW_REPORTER_OUTPUT;
  let dataFile = options.dataFile;

  if (!dataFile) {
    if (envOutput) {
      if (envOutput.endsWith('.json')) {
        dataFile = isAbsolute(envOutput) ? envOutput : resolve(process.cwd(), envOutput);
      } else {
        dataFile = isAbsolute(envOutput)
          ? resolve(envOutput, 'report.json')
          : resolve(process.cwd(), envOutput, 'report.json');
      }
    }
  }

  // A data-free build ships an empty template: no embedded report or history
  // data can leak into the published package. This happens when the caller
  // opts in via `skip` (e.g. the template build pass), or when no data source
  // is configured at all (no explicit dataFile and no PW_REPORTER_OUTPUT).
  const dataFree = options.skip || (!dataFile && !envOutput);

  if (dataFree) {
    return {
      name: 'inject-report-data',
      transformIndexHtml(html) {
        return html;
      },
    };
  }

  if (dataFile) {
    return {
      name: 'inject-report-data',
      transformIndexHtml(html) {
        let out = html;

        if (existsSync(dataFile)) {
          try {
            const data = readFileSync(dataFile, 'utf8');
            const safeData = data.replace(/</g, '\\u003c');
            const script = `<script id="report-data" type="application/json">${safeData}</script>`;
            out = out.replace('</head>', `${script}\n</head>`);
          } catch {
            /* ignore */
          }
        }

        const historyFile = resolve(dirname(dataFile), 'history.json');

        if (existsSync(historyFile)) {
          try {
            const data = readFileSync(historyFile, 'utf8');
            const safeData = data.replace(/</g, '\\u003c');
            const script = `<script id="history-data" type="application/json">${safeData}</script>`;
            out = out.replace('</head>', `${script}\n</head>`);
          } catch {
            /* ignore */
          }
        }

        return out;
      },
    };
  }

  return {
    name: 'inject-report-data',
    transformIndexHtml(html) {
      return html;
    },
  };
}
