import react from '@vitejs/plugin-react';
import { existsSync, readFileSync } from 'fs';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';
import { defineConfig, type Plugin } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';
import type { TestCase, TestSuite } from '@arpanp/zen-core';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Monorepo root is two levels up from packages/ui
const MONOREPO_ROOT = resolve(__dirname, '../..');

// Default report output directory (e.g. <root>/zen-report)
const REPORT_DIR = resolve(MONOREPO_ROOT, process.env.PW_REPORTER_OUTPUT || 'zen-report');

// Dev server middleware that serves report.json, history.json, attachments, and historical run APIs during `npm run dev`
const serveReportAssets: Plugin = {
  name: 'serve-report-assets',
  configureServer(server) {
    server.middlewares.use('/api/runs', async (req, res, next) => {
      if (!req.url || req.method !== 'GET') return next();

      try {
        const { SqliteHistoryStore } = await import('@arpanp/zen-reporter');
        const dbPath = resolve(REPORT_DIR, 'history.db');
        if (!existsSync(dbPath)) {
          res.statusCode = 404;
          res.setHeader('content-type', 'application/json; charset=utf-8');
          res.end(JSON.stringify({ error: 'history.db not found' }));
          return;
        }

        const store = new SqliteHistoryStore({ dbPath, autoMigrate: false });

        // Route: /api/runs (empty or "/")
        if (req.url === '' || req.url === '/') {
          const history = await store.getHistoryData();
          res.statusCode = 200;
          res.setHeader('content-type', 'application/json; charset=utf-8');
          res.end(JSON.stringify({ runs: history.runs }));
          await store.close();
          return;
        }

        // Route: /api/runs/:runId
        const runId = decodeURIComponent(req.url.replace(/^\//, ''));
        const runReport = await store.getRunReport(runId);
        await store.close();

        if (!runReport) {
          res.statusCode = 404;
          res.setHeader('content-type', 'application/json; charset=utf-8');
          res.end(JSON.stringify({ error: `Run "${runId}" not found` }));
          return;
        }

        res.statusCode = 200;
        res.setHeader('content-type', 'application/json; charset=utf-8');
        res.end(JSON.stringify(runReport));
      } catch (err) {
        res.statusCode = 500;
        res.setHeader('content-type', 'application/json; charset=utf-8');
        res.end(JSON.stringify({ error: String((err as Error)?.message || err) }));
      }
    });

    server.middlewares.use('/api/tests', async (req, res, next) => {
      if (!req.url || req.method !== 'GET') return next();

      try {
        const { SqliteHistoryStore } = await import('@arpanp/zen-reporter');
        const dbPath = resolve(REPORT_DIR, 'history.db');
        if (!existsSync(dbPath)) {
          res.statusCode = 404;
          res.setHeader('content-type', 'application/json; charset=utf-8');
          res.end(JSON.stringify({ error: 'history.db not found' }));
          return;
        }

        const store = new SqliteHistoryStore({ dbPath, autoMigrate: false });
        const parts = req.url.replace(/^\//, '').split('/');
        const runId = decodeURIComponent(parts[0] || '');
        const testId = decodeURIComponent(parts.slice(1).join('/'));

        const runReport = await store.getRunReport(runId);
        await store.close();

        if (!runReport) {
          res.statusCode = 404;
          res.setHeader('content-type', 'application/json; charset=utf-8');
          res.end(JSON.stringify({ error: `Run "${runId}" not found` }));
          return;
        }

        let foundCase: TestCase | null = null;
        const searchSuites = (suites: TestSuite[]) => {
          for (const s of suites || []) {
            for (const c of s.cases || []) {
              if (c.title === testId || `${runId}::${c.fileName}::${c.title}` === testId) {
                foundCase = c;
                return;
              }
            }
            if (s.subSuites) searchSuites(s.subSuites);
          }
        };
        searchSuites(runReport.testRun.suites);

        const matchedCase = foundCase as TestCase | null;
        if (!matchedCase) {
          res.statusCode = 404;
          res.setHeader('content-type', 'application/json; charset=utf-8');
          res.end(JSON.stringify({ error: `Test "${testId}" not found in run "${runId}"` }));
          return;
        }

        res.statusCode = 200;
        res.setHeader('content-type', 'application/json; charset=utf-8');
        res.end(
          JSON.stringify({
            steps: matchedCase.steps || [],
            errors: matchedCase.errors || [],
            stdout: matchedCase.stdout || [],
            stderr: matchedCase.stderr || [],
            attachments: matchedCase.attachments || [],
            failedAttempts: matchedCase.failedAttempts || [],
            attempts: matchedCase.attempts,
          })
        );
      } catch (err) {
        res.statusCode = 500;
        res.setHeader('content-type', 'application/json; charset=utf-8');
        res.end(JSON.stringify({ error: String((err as Error)?.message || err) }));
      }
    });

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

    server.middlewares.use('/attachments', (req, res, next) => {
      if (!req.url) return next();
      const filename = req.url.replace(/^\//, '');
      const file = resolve(REPORT_DIR, 'attachments', filename);
      if (!existsSync(file)) return next();
      res.statusCode = 200;
      res.end(readFileSync(file));
    });
  },
};

export default defineConfig({
  plugins: [
    react(),
    serveReportAssets,
    viteSingleFile({
      useRecommendedBuildConfig: true,
      removeViteModuleLoader: true,
    }),
  ],
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      '@arpanp/zen-reporter': resolve(__dirname, '../reporter/src/lib/reporter.ts'),
    },
  },
  build: {
    target: 'esnext',
    assetsInlineLimit: 100000000,
    chunkSizeWarningLimit: 100000000,
    cssCodeSplit: false,
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      output: {
        inlineDynamicImports: true,
      },
    },
  },
});
