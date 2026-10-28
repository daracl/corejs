// 하네스의 CLI 계약과 훅 실패 전달을 별도 Node 프로세스로 검증한다.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const cli = resolve(root, 'scripts/harness.mjs');
const hook = resolve(root, '.claude/hooks/style-check.mjs');
const run = (args, options = {}) => spawnSync(process.execPath, args, { cwd: root, encoding: 'utf8', ...options });
const input = file => JSON.stringify({ tool_input: { file_path: file } });

test('프로젝트 밖의 cwd에서도 점검 JSON을 반환한다', () => {
  const result = run([cli, 'audit', '--json'], { cwd: dirname(root) });
  assert.equal(result.status, 0, result.stderr);
  const report = JSON.parse(result.stdout);
  assert.equal(report.project, '@daracl/core');
  assert.equal(report.errors, 0);
  assert.ok(report.sourceFiles > 0);
});

test('알 수 없는 명령과 추가 셸 인자를 거부한다', () => {
  for (const args of [['publish'], ['build', '--outDir', '../dist'], ['test', '--watch']]) {
    const result = run([cli, ...args]);
    assert.equal(result.status, 1, result.stdout);
  }
});

test('test 폴더 밖의 테스트 경로를 거부한다', () => {
  const result = run([cli, 'test', '../other.test.ts']);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /test\/.*test.ts/);
});

test('PATH에 node/npm이 없어도 같은 Node로 타입 검사한다', () => {
  const result = run([cli, 'typecheck'], { env: { ...process.env, PATH: '' } });
  assert.equal(result.status, 0, result.stderr);
});

test('SCSS 훅은 관련 파일만 컴파일하고 잘못된 입력은 무시한다', () => {
  for (const value of [input('style/daracl.scss'), input('src/Loading.ts'), input('../style/outside.scss'), '{']) {
    const result = run([hook], { input: value });
    assert.equal(result.status, 0, result.stderr);
  }
});

test('SCSS 훅은 컴파일 실패를 종료 코드 2로 전달한다', () => {
  // 실제 SCSS를 손상시키지 않고 자식 프로세스의 Sass 로더만 대체한다.
  const code = `
    const Module = require('node:module');
    const original = Module._load;
    Module._load = function(id, ...args) {
      if (id === 'sass') return { compile() { throw new Error('fixture sass failure'); } };
      return original.call(this, id, ...args);
    };
    import('./.claude/hooks/style-check.mjs');
  `;
  const result = run(['-e', code], { input: input('style/daracl.scss') });
  assert.equal(result.status, 2, result.stderr);
  assert.match(result.stderr, /fixture sass failure/);
});
