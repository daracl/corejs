import { defineConfig } from 'vite';
import path from 'path';
import { fileURLToPath } from 'node:url';
import { commonConfig, createAssetFileNames, topBanner } from './vite.common.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig(({ mode }) => {
  const isProd = mode === 'production';

  return {
    ...commonConfig,

    build: {
      target: ['chrome109', 'edge109', 'firefox109', 'safari16.3'],
      outDir: isProd ? 'dist' : 'dist/unmin',
      emptyOutDir: true,
      sourcemap: true,
      reportCompressedSize: false,
      minify: isProd ? 'esbuild' : false,

      lib: {
        entry: path.resolve(__dirname, 'src/index.ts'),
        name: 'Daracl',
        formats: ['es', 'cjs'],
        fileName: (format) => {
                    
          if (format === 'es') {
            return isProd ? `index.min.js` : `index.js`;  
          }

          if (format === 'cjs') {
            return isProd ? `index.min.cjs` : `index.cjs`;  
          }

          // es / cjs
          return isProd ? `index.min.${format}.js` : `index.${format}.js`;
        }
      },

      rollupOptions: {
        output: {
          banner: topBanner,
          assetFileNames: createAssetFileNames(isProd)
        },
      },
    },
  };
});
