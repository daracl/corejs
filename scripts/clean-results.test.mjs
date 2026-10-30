// test-results 정리 로직을 임시 프로젝트 폴더에서 검증한다. 실제 test-results 는 건드리지 않는다.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, rmSync, symlinkSync, utimesSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { autoCleanResults, cleanResults, formatBytes } from './clean-results.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const DAY = 24 * 60 * 60 * 1000;

function fixture() {
  const project = mkdtempSync(join(tmpdir(), 'clean-results-'));
  const base = join(project, 'test-results');
  mkdirSync(base);
  const age = (path, days) => { const time = new Date(Date.now() - days * DAY); utimesSync(path, time, time); };
  mkdirSync(join(base, 'old-run'));
  writeFileSync(join(base, 'old-run', 'bundle.js'), 'x'.repeat(2048));
  age(join(base, 'old-run'), 10);
  mkdirSync(join(base, 'new-run'));
  writeFileSync(join(base, 'new-run', 'bundle.js'), 'y');
  writeFileSync(join(base, 'old-report.html'), 'z'.repeat(100));
  age(join(base, 'old-report.html'), 30);
  mkdirSync(join(base, 'uploads'));
  writeFileSync(join(base, 'uploads', 'keep.bin'), 'u');
  age(join(base, 'uploads'), 365);
  return { project, base, cleanup: () => rmSync(project, { recursive: true, force: true }) };
}

test('기간이 지난 항목만 삭제하고 최근 항목과 uploads 는 유지한다', () => {
  const { project, base, cleanup } = fixture();
  try {
    const result = cleanResults({ projectRoot: project, days: 7 });
    assert.deepEqual(result.removed.map(item => item.name).sort(), ['old-report.html', 'old-run']);
    assert.equal(result.freedBytes, 2048 + 100);
    assert.equal(existsSync(join(base, 'old-run')), false);
    assert.equal(existsSync(join(base, 'old-report.html')), false);
    assert.equal(existsSync(join(base, 'new-run', 'bundle.js')), true);
    assert.equal(existsSync(join(base, 'uploads', 'keep.bin')), true);
    assert.deepEqual(result.kept.map(item => `${item.name}:${item.reason}`).sort(), ['new-run:recent', 'uploads:protected']);
    assert.equal(cleanResults({ projectRoot: project, days: 7 }).removed.length, 0);
  } finally { cleanup(); }
});

test('dry-run 은 삭제하지 않고 대상만 계산한다', () => {
  const { project, base, cleanup } = fixture();
  try {
    const result = cleanResults({ projectRoot: project, days: 7, dryRun: true });
    assert.equal(result.removed.length, 2);
    assert.equal(result.dryRun, true);
    assert.equal(existsSync(join(base, 'old-run')), true);
    assert.equal(existsSync(join(base, 'old-report.html')), true);
  } finally { cleanup(); }
});

test('--all 은 최근 항목까지 지우되 uploads 는 유지한다', () => {
  const { project, base, cleanup } = fixture();
  try {
    const result = cleanResults({ projectRoot: project, all: true });
    assert.deepEqual(result.removed.map(item => item.name).sort(), ['new-run', 'old-report.html', 'old-run']);
    assert.equal(existsSync(join(base, 'new-run')), false);
    assert.equal(existsSync(join(base, 'uploads', 'keep.bin')), true);
  } finally { cleanup(); }
});

test('근거 기록(audit JSON, 성능·통합 로그)은 기간과 --all 모두에서 유지한다', () => {
  const { project, base, cleanup } = fixture();
  try {
    const names = ['security-audit.json', 'build-security.log', 'utils-build.log', 'reporter-fix.log', 'build-performance-abc123', 'grid-core-integration'];
    for (const name of names) {
      const path = join(base, name);
      if (name.includes('.')) writeFileSync(path, 'e'); else { mkdirSync(path); writeFileSync(join(path, 'log.txt'), 'e'); }
      const time = new Date(Date.now() - 90 * DAY);
      utimesSync(path, time, time);
    }
    for (const options of [{ days: 7 }, { all: true }]) {
      const result = cleanResults({ projectRoot: project, ...options });
      assert.deepEqual(result.failed, []);
      for (const name of names) assert.equal(existsSync(join(base, name)), true, name);
      assert.equal(result.kept.filter(item => item.reason === 'evidence').length, names.length);
    }
  } finally { cleanup(); }
});

test('잘못된 days 를 거부하고 test-results 가 없으면 아무 일도 하지 않는다', () => {
  const { project, cleanup } = fixture();
  try {
    for (const days of [0, -1, 1.5, Number.NaN]) assert.throws(() => cleanResults({ projectRoot: project, days }), /1 이상의 정수/);
    const empty = mkdtempSync(join(tmpdir(), 'clean-results-empty-'));
    try { assert.deepEqual(cleanResults({ projectRoot: empty }).removed, []); } finally { rmSync(empty, { recursive: true, force: true }); }
  } finally { cleanup(); }
});

test('링크는 따라가지 않고 링크 자체만 삭제한다', t => {
  const { project, base, cleanup } = fixture();
  const outside = mkdtempSync(join(tmpdir(), 'clean-results-outside-'));
  try {
    writeFileSync(join(outside, 'precious.txt'), 'keep');
    try { symlinkSync(outside, join(base, 'link-run'), 'junction'); } catch { t.skip('이 환경에서는 링크를 만들 수 없습니다.'); return; }
    const time = new Date(Date.now() - 20 * DAY);
    try { utimesSync(join(base, 'link-run'), time, time); } catch { /* 링크 시각을 못 바꾸면 --all 로 대신 검증한다 */ }
    cleanResults({ projectRoot: project, all: true });
    assert.equal(existsSync(join(base, 'link-run')), false);
    assert.equal(existsSync(join(outside, 'precious.txt')), true, '링크 대상의 파일이 삭제되면 안 됩니다.');
  } finally { rmSync(outside, { recursive: true, force: true }); cleanup(); }
});

test('자동 정리는 환경 변수로 끄거나 기간을 바꿀 수 있고 실패해도 예외를 던지지 않는다', () => {
  const { project, base, cleanup } = fixture();
  try {
    const logs = [];
    for (const value of ['0', 'off', 'OFF']) assert.equal(autoCleanResults({ projectRoot: project, env: { DARACL_RESULTS_RETENTION_DAYS: value }, log: m => logs.push(m) }), null);
    assert.equal(existsSync(join(base, 'old-run')), true);
    // 15일 보존이면 10일 지난 항목은 남고 30일 지난 항목만 지워진다
    autoCleanResults({ projectRoot: project, env: { DARACL_RESULTS_RETENTION_DAYS: '15' }, log: m => logs.push(m) });
    assert.equal(existsSync(join(base, 'old-run')), true);
    assert.equal(existsSync(join(base, 'old-report.html')), false);
    assert.match(logs.join('\n'), /15일이 지난 산출물 1개/);
    // 잘못된 값은 기본 7일로 처리한다
    autoCleanResults({ projectRoot: project, env: { DARACL_RESULTS_RETENTION_DAYS: 'abc' }, log: m => logs.push(m) });
    assert.equal(existsSync(join(base, 'old-run')), false);
    // test-results 가 파일이면 경고만 남기고 null
    const broken = mkdtempSync(join(tmpdir(), 'clean-results-broken-'));
    try {
      writeFileSync(join(broken, 'test-results'), 'not a directory');
      assert.equal(autoCleanResults({ projectRoot: broken, env: {}, log: () => {} }), null);
    } finally { rmSync(broken, { recursive: true, force: true }); }
  } finally { cleanup(); }
});

test('CLI 는 잘못된 인자를 거부하고 dry-run 은 실제 폴더를 바꾸지 않는다', () => {
  const run = args => spawnSync(process.execPath, [join(root, 'scripts/clean-results.mjs'), ...args], { cwd: root, encoding: 'utf8' });
  for (const args of [['--days=0'], ['--days=abc'], ['--force'], ['--all', '--days=3'], ['--days']]) {
    const result = run(args);
    assert.equal(result.status, 1, args.join(' '));
  }
  const dry = run(['--dry-run']);
  assert.equal(dry.status, 0, dry.stderr);
  assert.match(dry.stdout, /\[dry-run\] test-results 7일 초과 항목 \d+개 삭제 대상/);
});

test('바이트 단위 표시', () => {
  assert.deepEqual([0, 1023, 1024, 1536, 5 * 1024 ** 2, 3 * 1024 ** 3].map(formatBytes), ['0B', '1023B', '1.0KB', '1.5KB', '5.0MB', '3.00GB']);
});
