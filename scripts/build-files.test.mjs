import assert from 'node:assert/strict';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { buildFiles } from './build-files.mjs';

const results = resolve(dirname(fileURLToPath(import.meta.url)), '../test-results');
mkdirSync(results, { recursive: true });
function fixture(t) {
  const root = mkdtempSync(join(results, 'build-files-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const put = (file, value) => {
    mkdirSync(dirname(join(root, file)), { recursive: true });
    writeFileSync(join(root, file), value);
  };
  return { root, put };
}

test('선언 파일만 하위 디렉터리 구조를 유지해 복사한다', t => {
  const { root, put } = fixture(t);
  put('src/types/web/Options.d.ts', 'export interface Options {}');
  put('src/implementation.ts', 'export const value = 1;');
  buildFiles('dts', root);
  assert.equal(readFileSync(join(root, 'dist/types/web/Options.d.ts'), 'utf8'), 'export interface Options {}');
  assert.equal(existsSync(join(root, 'dist/implementation.ts')), false);
});

test('빌드 병합과 정리가 production 파일을 보존한다', t => {
  const { root, put } = fixture(t);
  put('dist/index.min.js', 'minified');
  put('dist/unmin/index.js', 'development');
  put('dist/unmin/index.js.map', 'source-map');
  put('public/index.html', '<html></html>');
  buildFiles('unmin', root);
  buildFiles('html', root);
  buildFiles('clean-unmin', root);
  assert.deepEqual(readdirSync(join(root, 'dist')).sort(), ['index.html', 'index.js', 'index.js.map', 'index.min.js']);
  assert.equal(readFileSync(join(root, 'dist/index.min.js'), 'utf8'), 'minified');
  assert.equal(readFileSync(join(root, 'dist/index.js'), 'utf8'), 'development');
});

test('출력 디렉터리 링크를 통한 복사와 삭제를 거부한다', t => {
  const { root, put } = fixture(t);
  put('outside/keep.txt', 'keep');
  put('public/index.html', 'fixture');
  symlinkSync(join(root, 'outside'), join(root, 'dist'), 'junction');
  assert.throws(() => buildFiles('html', root), /심볼릭 링크/);
  assert.throws(() => buildFiles('clean-unmin', root), /심볼릭 링크/);
  assert.throws(() => buildFiles('clean-dist', root), /심볼릭 링크/);
  assert.equal(readFileSync(join(root, 'outside/keep.txt'), 'utf8'), 'keep');
});

test('전체 출력 정리는 오래된 생성물만 지운다', t => {
  const { root, put } = fixture(t);
  put('dist/nested/stale.js', 'old output');
  put('src/keep.ts', 'source');
  put('public/index.html', 'page');
  buildFiles('clean-dist', root);
  assert.equal(existsSync(join(root, 'dist')), false);
  assert.equal(readFileSync(join(root, 'src/keep.ts'), 'utf8'), 'source');
  assert.equal(readFileSync(join(root, 'public/index.html'), 'utf8'), 'page');
});
