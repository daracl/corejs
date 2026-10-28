import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';
import { commonConfig, topBanner } from './vite.common.mjs';

export default defineConfig({
  ...commonConfig,
  build: {
    target: ['chrome109', 'edge109', 'firefox109', 'safari16.3'],
    outDir: 'dist',
    emptyOutDir: false,
    sourcemap: true,
    reportCompressedSize: false,
    minify: false,
    copyPublicDir: false,
    lib: {
      entry: fileURLToPath(new URL('./src/utils/index.ts', import.meta.url)),
      formats: ['es', 'cjs'],
      fileName: format => format === 'es' ? 'utils.js' : 'utils.cjs',
    },
    rollupOptions: { output: { banner: topBanner } },
  },
});
