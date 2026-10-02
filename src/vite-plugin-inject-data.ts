import { existsSync, readFileSync } from 'fs';
import { dirname, isAbsolute, resolve } from 'path';
import type { Plugin } from 'vite';

export function injectReportData(options: { dataFile?: string } = {}): Plugin {
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
    } else {
      dataFile = resolve(process.cwd(), 'not-available.json');
    }
  }

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
