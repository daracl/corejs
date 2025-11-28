import { defineConfig } from 'vite';
import path from 'path';
import banner from 'vite-plugin-banner';
import packageJson from './package.json';

const topBanner = `/*!
* ${packageJson.name}  v${packageJson.version}
* Copyright 2023-${new Date().getUTCFullYear()} darainfo and other contributors; 
* Licensed ${packageJson.license}
*/`;

export default defineConfig(({ mode }) => {
  const isProd = mode === 'production';

  const moduleName = 'daracl.core';

  return {
    resolve: {
      alias: {
        "@": path.resolve(__dirname, 'src'),
        '@t': path.resolve(__dirname, 'src/types'),
      },
      extensions: ['.js', '.jsx', '.ts', '.tsx'],
    },
    build: {
      outDir: isProd ? 'dist' : 'dist/unmin',
      emptyOutDir: true,
      sourcemap: true,
      minify: isProd ? 'esbuild' : false,
      lib: {
        entry: path.resolve(__dirname, 'src/index.ts'),
        name: 'Daracl.core',
        formats: ['es', 'cjs', 'umd'],
        //formats: ['es', 'cjs'],
        fileName: (format) => {
          if (format === 'umd') {
            return isProd ? `${moduleName}.min.umd.js` : `${moduleName}.umd.js`;
          }

          if (format === 'es') {
            return isProd ? `index.min.js` : `index.js`;  
          }

          if (format === 'cjs') {
            return isProd ? `index.min.cjs` : `index.cjs`;  
          }

          // es / cjs
          return isProd ? `index.min.${format}.js` : `index.${format}.js`;
        },
      },
      rollupOptions: {
       
        output: {
        //  inlineDynamicImports: false,
          //preserveModules : true, // 내보내기 모듈 단위로 하기.
            //preserveModulesRoot: 'src',
          assetFileNames: (assetInfo) => {
              if (assetInfo.name.endsWith('.css')) {
              return isProd ? `${moduleName}.min.[ext]` : `${moduleName}.[ext]`;
              }
              return 'assets/[name].[ext]';
          }
          
         //assetFileNames: `${isProd ? 'daracl.tree.min' : 'daracl.tree'}.[ext]`,
        }
      },
    },
    plugins: [
      banner(topBanner),
    ],
    define: {
      APP_VERSION: JSON.stringify(packageJson.version),
    },
    server: {
      host: '0.0.0.0',
      port: 4171,
      open: true,
      watch: {
        ignored: ['!**/src/**'],
      },
    },
  };
});