import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { autoCleanResults } from './clean-results.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const npm = process.env.npm_execpath || join(dirname(process.execPath), 'node_modules/npm/bin/npm-cli.js');
if (!existsSync(npm)) throw new Error('npm CLI에서 실행하세요: npm run test:package');
// 이전 실행의 오래된 산출물을 정리한다(기본 7일, DARACL_RESULTS_RETENTION_DAYS=0 이면 끔)
autoCleanResults();
mkdirSync(join(root, 'test-results'), { recursive: true });
const directory = mkdtempSync(join(root, 'test-results/package-'));
const env = { ...process.env, PATH: `${dirname(process.execPath)}${process.platform === 'win32' ? ';' : ':'}${process.env.PATH ?? ''}` };

function run(args, cwd = root) {
  const result = spawnSync(process.execPath, args, { cwd, env, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`${args.join(' ')}\n${result.stdout}\n${result.stderr}`);
  return result;
}

// 실제 prepack 빌드와 npm의 files/exports 규칙으로 생성한 패키지를 검사합니다.
const packed = run([npm, 'pack', '--json', '--pack-destination', directory]);
writeFileSync(join(directory, 'pack.log'), packed.stdout + packed.stderr);
let manifest;
// npm 11의 배열과 npm 12의 패키지명 객체 형식을 함께 처리합니다.
for (const start of packed.stdout.matchAll(/(?:^|\n)(?=[\[{])/g)) {
  let parsed;
  try { parsed = JSON.parse(packed.stdout.slice(start.index).trim()); } catch { continue; }
  manifest = (Array.isArray(parsed) ? parsed : Object.values(parsed)).find(item => item.files && item.filename);
  if (manifest) break;
}
if (!manifest) throw new Error(`npm pack JSON을 찾을 수 없습니다: ${directory}`);
const files = new Set(manifest.files.map(file => file.path));
for (const file of ['dist/utils.js', 'dist/utils.cjs', 'dist/utils/index.d.ts']) {
  assert.ok(files.has(file), `공통 유틸 진입점 누락: ${file}`);
}
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
for (const file of [pkg.main, pkg.module, pkg.types, 'dist/daracl.core.umd.js', 'dist/daracl.core.min.umd.js', 'dist/daracl.core.css', 'dist/daracl.core.min.css', 'dist/types/web/AjaxOptions.d.ts']) {
  assert.ok(files.has(file.replace(/^\.\//, '')), `패키지에 필요한 파일 누락: ${file}`);
}
assert.equal([...files].some(file => /^(api|test|scripts|node_modules)\//.test(file)), false, '개발 파일이 패키지에 포함됐습니다.');

const consumer = join(directory, 'consumer');
mkdirSync(consumer);
writeFileSync(join(consumer, 'package.json'), JSON.stringify({ private: true, type: 'module' }));
run([npm, 'install', '--ignore-scripts', '--no-audit', '--no-fund', '--cache', join(root, 'test-results/npm-cache'), join(directory, manifest.filename)], consumer);
// 패키지에 포함된 style/*.css 가 Loading 스타일을 담고 있어야 한다(낡은 생성물 배포 방지)
for (const name of ['daracl.css', 'daracl.min.css']) {
  const css = readFileSync(join(consumer, 'node_modules/@daracl/core/style', name), 'utf8');
  assert.ok(css.includes('.daracl-cl') && css.includes('--daracl-loading-backdrop'), `style/${name} 에 Loading 스타일이 없습니다.`);
}
for (const mode of ['module', 'commonjs']) {
  const load = mode === 'module' ? "import * as core from '@daracl/core';" : "const core = require('@daracl/core');";
  run(['--input-type=' + mode, '-e', `${load} const assert = ${mode === 'module' ? '(await import("node:assert/strict")).default' : 'require("node:assert/strict")'}; assert.equal(core.isString('ok'), true); assert.equal(core.isString(1), false); assert.equal(core.VERSION, ${JSON.stringify(pkg.version)}); assert.equal(typeof globalThis.Daracl, 'undefined');`], consumer);
  // window 가 있는 환경(브라우저·번들러)에서 가져와도 window.Daracl 이 등록되지 않아야 한다(global.ts 가 sideEffects 로 제외되는 계약)
  const withWindow = mode === 'module' ? "globalThis.window = {}; const core = await import('@daracl/core');" : "globalThis.window = {}; const core = require('@daracl/core');";
  run(['--input-type=' + mode, '-e', `${withWindow} if (typeof core.isString !== 'function' || 'Daracl' in globalThis.window) throw new Error('ESM/CJS 진입점이 window.Daracl 을 등록했습니다.');`], consumer);
  const utilities = mode === 'module' ? "import * as utils from '@daracl/core/utils';" : "const utils = require('@daracl/core/utils');";
  run(['--input-type=' + mode, '-e', `${utilities} if (!utils.isString('ok') || 'Ajax' in utils || 'Loading' in utils) throw new Error('utils entry contract');`], consumer);
}
// 설치한 패키지의 선언 파일을 TypeScript 소비자로 컴파일한다(런타임 import 만으로는 선언 오류를 알 수 없다).
// 루트 진입점의 유틸 재내보내기, @daracl/core/utils 서브패스, AjaxResponse 제네릭을 모듈 해석 방식별로 확인한다.
const tsc = createRequire(join(root, 'package.json')).resolve('typescript/bin/tsc');
mkdirSync(join(consumer, 'ts'));
writeFileSync(join(consumer, 'ts/check.ts'), [
  "import { Ajax, Loading, AjaxError, objectDeepMerge, debounce, isString, type AjaxResponse, type AjaxOptions } from '@daracl/core';",
  "import { isString as isStringFromUtils } from '@daracl/core/utils';",
  "const response: Promise<AjaxResponse<number[]>> = Ajax.create().get<number[]>('/x');",
  "const merged: { a?: number; b?: number } = objectDeepMerge({ a: 1 }, { b: 2 });",
  "const delayed = debounce<[number], unknown>((value: number) => value, 1);",
  "const options: AjaxOptions = { rawBody: true };",
  "export { response, merged, delayed, options, isString, isStringFromUtils, Loading, AjaxError };",
].join('\n'));
for (const [moduleResolution, module] of [['bundler', 'esnext'], ['node16', 'node16'], ['node10', 'commonjs']]) {
  run([tsc, '--noEmit', '--strict', '--skipLibCheck', 'false', '--target', 'ES2020', '--lib', 'ES2022,DOM', '--module', module, '--moduleResolution', moduleResolution, 'ts/check.ts'], consumer);
}

console.log(`패키징·별도 소비자 ESM/CJS·TypeScript 선언 검증 통과: ${files.size}개 파일, ${directory}`);
