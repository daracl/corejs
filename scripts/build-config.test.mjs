import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { commonConfig, createAssetFileNames } from '../vite.common.mjs';

test('Rollup의 names API로 CSS 이름을 유지하며 이름 없는 자산도 처리한다', () => {
  const css = { names: ['core.css'], get name() { throw new Error('deprecated name access'); } };
  assert.equal(createAssetFileNames(true)(css), 'daracl.core.min.[ext]');
  assert.equal(createAssetFileNames(false)(css), 'daracl.core.[ext]');
  assert.equal(createAssetFileNames(true)({ names: [] }), 'assets/[name].[ext]');
});

test('와일드카드 exports로 기존 하위 파일 경로를 해석한다', () => {
  const require = createRequire(import.meta.url);
  const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
  assert.equal(pkg.exports['./dist/*'], './dist/*');
  assert.equal(pkg.exports['./style/*'], './style/*');
  assert.ok(require.resolve('@daracl/core/style/daracl.scss').endsWith('daracl.scss'));
});

test('개발 서버의 파일 접근을 현재 저장소로 제한한다', () => {
  assert.equal(commonConfig.server.host, '127.0.0.1');
  assert.equal(commonConfig.server.fs.strict, true);
  assert.deepEqual(commonConfig.server.fs.allow, [fileURLToPath(new URL('..', import.meta.url)).replace(/[\\/]$/, '')]);
  const root = new URL('../package.json', import.meta.url);
  assert.equal(JSON.parse(readFileSync(root, 'utf8')).name, '@daracl/core');
});
