import { defineConfig } from 'vite';
import path from 'path';
import { commonConfig, createAssetFileNames } from './vite.common.js';

export default defineConfig(({ mode }) => {
  const isProd = mode === 'production';

  return {
    ...commonConfig,

    build: {
      outDir: isProd ? 'dist' : 'dist/unmin',
      emptyOutDir: true,
      sourcemap: true,
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
          assetFileNames: createAssetFileNames(isProd)
        },
      },
    },
  };
});