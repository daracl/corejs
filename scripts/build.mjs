import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { performance } from 'node:perf_hooks';
import { fileURLToPath } from 'node:url';
import { build as viteBuild } from 'vite';
import esConfig from '../vite.config.mjs';
import umdConfig from '../vite.config.umd.mjs';
import { buildFiles } from './build-files.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);

function emitDeclarations() {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [require.resolve('typescript/bin/tsc'), '--project', 'tsconfig.json', '--emitDeclarationOnly'], {
      cwd: root, stdio: 'inherit', shell: false,
    });
    child.once('error', reject);
    child.once('exit', (code, signal) => {
      if (code === 0) resolve();
      else reject(new Error(`타입 선언 생성 실패 (종료 코드 ${code}, 신호 ${signal ?? '없음'})`));
    });
  });
}

async function emitBundles() {
  // 같은 출력에 쓰는 Vite 빌드는 순서대로 실행합니다.
  for (const mode of ['production', 'development']) {
    for (const createConfig of [esConfig, umdConfig]) {
      const config = createConfig({ command: 'build', mode });
      await viteBuild({
        ...config, root, configFile: false, mode,
        build: {
          ...config.build,
          // 시작할 때 한 번 정리하고, HTML은 마지막에 한 번만 복사합니다.
          emptyOutDir: false, copyPublicDir: false,
        },
      });
    }
  }
}

export async function buildProject() {
  const startedAt = performance.now();
  buildFiles('clean-dist');
  buildFiles('dts');
  // 선언과 번들은 파일명이 겹치지 않습니다. 두 작업이 끝난 뒤에만 병합합니다.
  const results = await Promise.allSettled([emitDeclarations(), emitBundles()]);
  const errors = results.filter(result => result.status === 'rejected').map(result => result.reason);
  if (errors.length) throw new AggregateError(errors, errors.map(error => error.message).join('\n'));
  buildFiles('unmin');
  buildFiles('clean-unmin');
  buildFiles('html');
  console.log(`전체 빌드 완료: ${((performance.now() - startedAt) / 1000).toFixed(2)}초`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (process.argv.length !== 2) throw new Error('추가 인자를 지원하지 않습니다.');
  buildProject().catch(error => { console.error(error.message); process.exitCode = 1; });
}
