import react from '@vitejs/plugin-react';
import { existsSync, readFileSync } from 'fs';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';
import { defineConfig, type Plugin } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';
import { injectReportData } from './src/vite-plugin-inject-data.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Default output directory, matching the app's own default (see vite-plugin-inject-data).
// Serves /report.json and /history.json from this dir on the dev server.
const REPORT_DIR = resolve(process.env.PW_REPORTER_OUTPUT || 'zen-report');

// Dev-server helper: serves /report.json and /history.json from the output dir.
const serveReportAssets: Plugin = {
  name: 'serve-report-assets',
  configureServer(server) {
    server.middlewares.use('/report.json', (_req, res, next) => {
      const file = resolve(REPORT_DIR, 'report.json');
      if (!existsSync(file)) return next();
      res.statusCode = 200;
      res.setHeader('content-type', 'application/json; charset=utf-8');
      res.end(readFileSync(file));
    });

    server.middlewares.use('/history.json', (_req, res, next) => {
      const file = resolve(REPORT_DIR, 'history.json');
      if (!existsSync(file)) return next();
      res.statusCode = 200;
      res.setHeader('content-type', 'application/json; charset=utf-8');
      res.end(readFileSync(file));
    });
  },
};

export default defineConfig({
  plugins: [
    react(),
    serveReportAssets,
    // Local dev preview inlines local report/history data by default. Set
    // ZEN_REPORTER_DATA_FREE=true (as the publish build does) to ship an empty
    // template with no embedded data.
    injectReportData({
      skip: process.env.ZEN_REPORTER_DATA_FREE === 'true',
    }),
    viteSingleFile(),
  ],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    assetsInlineLimit: 10000000,
    rollupOptions: {
      external: ['fs', 'node:fs'],
    },
  },
});
