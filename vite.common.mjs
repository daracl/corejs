import path from 'path';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const packageJson = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'));

export const topBanner = `/*!
* ${packageJson.name} v${packageJson.version}
* Copyright 2023-${new Date().getUTCFullYear()} darainfo;
* Licensed ${packageJson.license}
*/`;


const moduleName = 'daracl.core';

export const MODULE_NAME = moduleName;

/** 공통 asset 설정 */
export const createAssetFileNames = (isProd) => {
  return (assetInfo) => {
    if (assetInfo.names.some(name => name.endsWith('.css'))) {
      return isProd ? `${MODULE_NAME}.min.[ext]` : `${MODULE_NAME}.[ext]`;
    }
    return 'assets/[name].[ext]';
  };
};

export const commonConfig = {
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      '@t': path.resolve(__dirname, 'src/types'),
    },
    extensions: ['.js', '.jsx', '.ts', '.tsx'],
  },

  css: {
    preprocessorOptions: { scss: { api: 'modern' } },
  },

  preview: { host: '127.0.0.1' },

  define: {
    APP_VERSION: JSON.stringify(packageJson.version),
  },
  server: {
    host: '127.0.0.1',
    // 형제 저장소의 파일이 개발 서버에 노출되지 않도록 범위를 제한합니다.
    fs: { strict: true, allow: [__dirname] },
    port: 4171,
    open: true,
    watch: {
      ignored: ['!**/src/**'],
    },
  },
};
