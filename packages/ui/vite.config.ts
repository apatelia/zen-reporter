import react from '@vitejs/plugin-react';
import { existsSync, readFileSync } from 'fs';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';
import { defineConfig, type Plugin } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Monorepo root is two levels up from packages/ui
const MONOREPO_ROOT = resolve(__dirname, '../..');

// Default report output directory (e.g. <root>/zen-report)
const REPORT_DIR = resolve(MONOREPO_ROOT, process.env.PW_REPORTER_OUTPUT || 'zen-report');

// Dev server middleware that serves report.json, history.json, and attachments during `npm run dev`
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
