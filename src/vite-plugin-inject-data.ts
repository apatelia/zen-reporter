import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';
import type { Plugin } from 'vite';

export function injectReportData(options: { dataFile?: string } = {}): Plugin {
  const outputDir = process.env.PW_REPORTER_OUTPUT || 'zen-report';
  const dataFile = options.dataFile || resolve(process.cwd(), outputDir, 'report.json');

  return {
    name: 'inject-report-data',
    transformIndexHtml(html) {
      if (!existsSync(dataFile)) return html;
      try {
        const data = readFileSync(dataFile, 'utf8');
        const script = `<script id="report-data" type="application/json">${data}</script>`;
        return html.replace('</head>', `${script}\n</head>`);
      } catch {
        return html;
      }
    },
  };
}
