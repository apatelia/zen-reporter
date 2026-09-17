import react from '@vitejs/plugin-react';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';
import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';
import { injectReportData } from './src/vite-plugin-inject-data.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default defineConfig({
  plugins: [react(), injectReportData(), viteSingleFile()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    assetsInlineLimit: 10000000,
    rolldownOptions: {
      external: ['fs', 'node:fs'],
    },
    rollupOptions: {
      external: ['fs', 'node:fs'],
      output: {
        dir: 'dist',
      },
    },
  },
});
