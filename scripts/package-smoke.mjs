import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const npm = process.env.npm_execpath || join(dirname(process.execPath), 'node_modules/npm/bin/npm-cli.js');
if (!existsSync(npm)) throw new Error('npm CLI에서 실행하세요: npm run test:package');
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
for (const mode of ['module', 'commonjs']) {
  const load = mode === 'module' ? "import * as core from '@daracl/core';" : "const core = require('@daracl/core');";
  run(['--input-type=' + mode, '-e', `${load} const assert = ${mode === 'module' ? '(await import("node:assert/strict")).default' : 'require("node:assert/strict")'}; assert.equal(core.isString('ok'), true); assert.equal(core.isString(1), false); assert.equal(core.VERSION, ${JSON.stringify(pkg.version)}); assert.equal(typeof globalThis.Daracl, 'undefined');`], consumer);
  const utilities = mode === 'module' ? "import * as utils from '@daracl/core/utils';" : "const utils = require('@daracl/core/utils');";
  run(['--input-type=' + mode, '-e', `${utilities} if (!utils.isString('ok') || 'Ajax' in utils || 'Loading' in utils) throw new Error('utils entry contract');`], consumer);
}
console.log(`패키징·별도 소비자 ESM/CJS 검증 통과: ${files.size}개 파일, ${directory}`);
