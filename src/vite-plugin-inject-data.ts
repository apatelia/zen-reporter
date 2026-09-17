import { existsSync, readFileSync } from 'fs';
import { isAbsolute, resolve } from 'path';
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
      dataFile = resolve(process.cwd(), 'zen-report', 'report.json');
    }
  }

  return {
    name: 'inject-report-data',
    transformIndexHtml(html) {
      if (!existsSync(dataFile)) return html;
      try {
        const data = readFileSync(dataFile, 'utf8');
        const safeData = data.replace(/</g, '\\u003c');
        const script = `<script id="report-data" type="application/json">${safeData}</script>`;
        return html.replace('</head>', `${script}\n</head>`);
      } catch {
        return html;
      }
    },
  };
}
