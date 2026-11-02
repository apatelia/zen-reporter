import { defineConfig } from 'vite';

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
        '@arpanp/zen-core',
      ],
      output: {
        exports: 'named',
      },
    },
  },
});
