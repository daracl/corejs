// style/daracl.scss 를 배포용 style/*.css(+소스맵)로 컴파일한다. 직접 수정하지 않는 생성물이다.
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(join(root, 'package.json'));

const ENTRY = 'daracl.scss';
const TARGETS = [
  { css: 'daracl.css', style: 'expanded' },
  { css: 'daracl.min.css', style: 'compressed' },
];

const normalize = text => text.replace(/\r\n/g, '\n');

/**
 * 컴파일 결과를 { 파일명: 내용 } 으로 반환합니다. 소스맵의 sources 는 절대 경로 대신 SCSS 파일명으로 고정해
 * 운영체제·작업 폴더와 관계없이 같은 결과를 만듭니다.
 */
export function compileStyleOutputs(projectRoot = root) {
  const sass = require('sass');
  const outputs = {};
  for (const { css, style } of TARGETS) {
    const result = sass.compile(join(projectRoot, 'style', ENTRY), {
      style, sourceMap: true, loadPaths: [join(root, 'node_modules')], logger: sass.Logger.silent,
    });
    const map = { ...result.sourceMap, sources: [ENTRY], file: css };
    delete map.sourcesContent;
    outputs[css] = `${normalize(result.css).trimEnd()}\n/*# sourceMappingURL=${css}.map */\n`;
    outputs[`${css}.map`] = `${JSON.stringify(map)}\n`;
  }
  return outputs;
}

/** SCSS 를 컴파일해 style/ 의 생성 파일을 갱신하고 갱신한 파일명을 반환합니다. */
export function writeStyles(projectRoot = root) {
  const outputs = compileStyleOutputs(projectRoot);
  for (const [name, content] of Object.entries(outputs)) writeFileSync(join(projectRoot, 'style', name), content);
  return Object.keys(outputs);
}

/** 저장된 생성 파일이 SCSS 와 다르거나 없는 파일 이름을 반환합니다. 줄바꿈 차이는 무시합니다. */
export function staleStyles(projectRoot = root) {
  return Object.entries(compileStyleOutputs(projectRoot)).filter(([name, content]) => {
    const file = join(projectRoot, 'style', name);
    return !existsSync(file) || normalize(readFileSync(file, 'utf8')) !== content;
  }).map(([name]) => name);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (process.argv.length > 3 || (process.argv[2] && process.argv[2] !== '--check')) throw new Error('사용법: node scripts/build-styles.mjs [--check]');
  if (process.argv[2] === '--check') {
    const stale = staleStyles();
    if (stale.length) { console.error(`style/ 생성 파일이 daracl.scss 와 다릅니다: ${stale.join(', ')}\nnpm run build 로 갱신하세요.`); process.exitCode = 1; }
    else console.log('style/ 생성 파일이 최신입니다.');
  } else console.log(`style/ 생성 파일을 갱신했습니다: ${writeStyles().join(', ')}`);
}
