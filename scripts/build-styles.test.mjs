// style/*.css 생성 파일이 SCSS 와 일치하고 이식 가능한 형태로 만들어지는지 검증한다.
import assert from 'node:assert/strict';
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { compileStyleOutputs, staleStyles, writeStyles } from './build-styles.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

test('저장소의 style/*.css 는 daracl.scss 와 일치한다', () => {
  assert.deepEqual(staleStyles(), [], 'npm run build 로 style/ 생성 파일을 갱신하세요.');
});

test('생성 파일은 Loading 스타일을 포함하고 소스맵이 절대 경로를 담지 않는다', () => {
  const outputs = compileStyleOutputs();
  assert.deepEqual(Object.keys(outputs).sort(), ['daracl.css', 'daracl.css.map', 'daracl.min.css', 'daracl.min.css.map']);
  for (const name of ['daracl.css', 'daracl.min.css']) {
    assert.match(outputs[name], /\.daracl-cl/);
    assert.match(outputs[name], /--daracl-loading-backdrop/);
    assert.match(outputs[name], new RegExp(`sourceMappingURL=${name.replace('.', '\\.')}\\.map`));
    assert.equal(outputs[name].includes('\r'), false);
  }
  for (const name of ['daracl.css.map', 'daracl.min.css.map']) {
    const map = JSON.parse(outputs[name]);
    assert.deepEqual(map.sources, ['daracl.scss']);
    assert.equal('sourcesContent' in map, false);
    assert.equal(outputs[name].includes(root.replaceAll('\\', '/')), false);
  }
});

test('writeStyles 는 지정한 프로젝트의 style/ 만 갱신하고 staleStyles 가 변경을 감지한다', () => {
  const project = mkdtempSync(join(tmpdir(), 'build-styles-'));
  try {
    mkdirSync(join(project, 'style'));
    copyFileSync(join(root, 'style', 'daracl.scss'), join(project, 'style', 'daracl.scss'));
    assert.equal(staleStyles(project).length, 4);
    assert.equal(writeStyles(project).length, 4);
    assert.deepEqual(staleStyles(project), []);

    const css = join(project, 'style', 'daracl.css');
    const content = readFileSync(css, 'utf8');
    // 줄바꿈이 CRLF 로 바뀌어도(autocrlf) 최신으로 본다
    writeFileSync(css, content.replaceAll('\n', '\r\n'));
    assert.deepEqual(staleStyles(project), []);
    // 내용이 달라지면 해당 파일만 감지한다
    writeFileSync(css, content.replace('12px', '13px'));
    assert.deepEqual(staleStyles(project), ['daracl.css']);
    // 생성 파일이 없으면 감지한다
    rmSync(join(project, 'style', 'daracl.min.css'));
    assert.deepEqual(staleStyles(project).sort(), ['daracl.css', 'daracl.min.css']);
    // 실제 저장소 파일은 건드리지 않았다
    assert.deepEqual(staleStyles(), []);
  } finally { rmSync(project, { recursive: true, force: true }); }
});
