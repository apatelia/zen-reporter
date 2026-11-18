import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    ssr: true,
    lib: {
      entry: 'src/index.ts',
      formats: ['es', 'cjs'],
      fileName: (format) => (format === 'es' ? 'index.js' : 'index.cjs'),
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
        'http',
        '@duckdb/node-api',
        '@arpanp/zen-core',
      ],
      output: {
        exports: 'named',
      },
    },
  },
});
