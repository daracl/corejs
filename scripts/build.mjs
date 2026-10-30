import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { performance } from 'node:perf_hooks';
import { fileURLToPath } from 'node:url';
import { build as viteBuild } from 'vite';
import esConfig from '../vite.config.mjs';
import umdConfig from '../vite.config.umd.mjs';
import utilsConfig from '../vite.config.utils.mjs';
import { buildFiles } from './build-files.mjs';
import { writeStyles } from './build-styles.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);

function emitDeclarations(directory) {
  return new Promise((done, reject) => {
    const args = [require.resolve('typescript/bin/tsc'), '--project', 'tsconfig-build.json', '--emitDeclarationOnly'];
    if (directory) args.push('--declarationDir', resolve(directory, 'types'), '--outDir', resolve(directory, 'types'));
    const child = spawn(process.execPath, args, {
      cwd: root, stdio: 'inherit', shell: false,
    });
    child.once('error', reject);
    child.once('exit', (code, signal) => {
      if (code === 0) done();
      else reject(new Error(`타입 선언 생성 실패 (종료 코드 ${code}, 신호 ${signal ?? '없음'})`));
    });
  });
}

async function emitBundles(directory) {
  // production 과 development 는 출력 위치가 달라 병렬로 실행하고, 같은 출력에 쓰는 ES/CJS 와 UMD 는 순서대로 실행합니다.
  const emitMode = async (mode) => {
    for (const [createConfig, format] of [[esConfig, 'es-cjs'], [umdConfig, 'umd']]) {
      const config = createConfig({ command: 'build', mode });
      await viteBuild({
        ...config, root, configFile: false, mode,
        build: {
          ...config.build,
          ...(directory ? { outDir: resolve(directory, `${format}-${mode}`) } : {}),
          // 시작할 때 한 번 정리하고, HTML은 마지막에 한 번만 복사합니다.
          emptyOutDir: false, copyPublicDir: false,
        },
      });
    }
  };
  await Promise.all(['production', 'development'].map(emitMode));
}

async function emitUtils(directory) {
  await viteBuild({ ...utilsConfig, root, configFile: false, mode: 'production',
    build: { ...utilsConfig.build, ...(directory ? { outDir: resolve(directory, 'utils') } : {}) },
  });
}

// 실패해도 나머지 출력 작업이 끝난 후 종료합니다.
export async function buildOutputs(directory) {
  const startedAt = performance.now();
  const results = await Promise.allSettled([emitDeclarations(directory), emitBundles(directory), emitUtils(directory)]);
  const errors = results.filter(result => result.status === 'rejected').map(result => result.reason);
  if (errors.length) throw new AggregateError(errors, errors.map(error => error.message).join('\n'));
  console.log(`선언·번들 생성 완료: ${((performance.now() - startedAt) / 1000).toFixed(2)}초`);
}

export async function buildProject() {
  const startedAt = performance.now();
  buildFiles('clean-dist');
  buildFiles('dts');
  // style/ 의 배포용 CSS 는 SCSS 에서 생성한다(직접 수정하지 않음)
  writeStyles();
  // 선언과 번들은 파일명이 겹치지 않습니다. 모든 작업이 끝난 뒤에만 병합합니다.
  await buildOutputs();
  buildFiles('unmin');
  buildFiles('clean-unmin');
  buildFiles('html');
  console.log(`전체 빌드 완료: ${((performance.now() - startedAt) / 1000).toFixed(2)}초`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (process.argv.length !== 2) throw new Error('추가 인자를 지원하지 않습니다.');
  buildProject().catch(error => { console.error(error.message); process.exitCode = 1; });
}
