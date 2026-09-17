import { defineConfig } from 'vite';

// Bundles the Playwright reporter entry into plain JS for shipping using Rolldown via Vite.
// Distinct from vite.config.ts: library mode, dual CJS/ESM output, SSR/Node target, and
// emptyOutDir disabled so the pre-built template dist/index.html survives.
export default defineConfig({
  build: {
    ssr: true,
    lib: {
      entry: 'src/lib/reporter.ts',
      formats: ['es', 'cjs'],
      fileName: (format) => (format === 'es' ? 'reporter.js' : 'reporter.cjs'),
    },
    outDir: 'dist',
    emptyOutDir: false,
    sourcemap: false,
    minify: false,
    rollupOptions: {
      external: [
        /^node:.*/,
        'fs',
        'path',
        'child_process',
        'url',
        'events',
        'os',
        'stream',
        'util',
        '@playwright/test',
        '@playwright/test/reporter',
      ],
      output: {
        exports: 'named',
      },
    },
  },
});
