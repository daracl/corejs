import assert from 'node:assert/strict';
import test from 'node:test';
import { createAssetFileNames } from '../vite.common.mjs';

test('Rollup의 names API로 CSS 이름을 유지하며 이름 없는 자산도 처리한다', () => {
  const css = { names: ['core.css'], get name() { throw new Error('deprecated name access'); } };
  assert.equal(createAssetFileNames(true)(css), 'daracl.core.min.[ext]');
  assert.equal(createAssetFileNames(false)(css), 'daracl.core.[ext]');
  assert.equal(createAssetFileNames(true)({ names: [] }), 'assets/[name].[ext]');
});
