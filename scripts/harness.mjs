// ui-common-harness의 점검·검증 흐름을 corejs에 맞춘 실행기.
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { existsSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, isAbsolute, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(join(root, 'package.json'));
const read = (file) => readFileSync(join(root, file), 'utf8');
const installed = (name) => {
  try { return require.resolve(name); } catch {
    // Vite의 exports에 CLI 경로가 없어도 package.json의 실제 파일을 사용할 수 있다.
    if (name === 'vite/bin/vite.js') {
      try {
        const cli = join(dirname(require.resolve('vite/package.json')), 'bin', 'vite.js');
        return existsSync(cli) ? cli : null;
      } catch { return null; }
    }
    return null;
  }
};

function walk(directory) {
  if (!existsSync(directory)) return [];
  return readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const file = join(directory, entry.name);
    if (entry.isSymbolicLink()) return [];
    return entry.isDirectory() ? walk(file) : [file];
  });
}

// 빌드 도구가 기존 링크를 따라 작업 트리 밖에 쓰거나 지우지 못하게 한다.
function artifactDirectory() {
  let current = root;
  for (const part of ['test-results', 'harness']) {
    current = join(current, part);
    if (existsSync(current)) {
      if (lstatSync(current).isSymbolicLink() || !lstatSync(current).isDirectory()) {
        throw new Error(`산출물 경로는 실제 디렉터리여야 합니다: ${current}`);
      }
    } else mkdirSync(current);
  }
  return mkdtempSync(join(current, 'run-'));
}

function run(tool, args) {
  const entry = installed(tool);
  if (!entry) throw new Error(`도구가 없습니다: ${tool}. 의존성을 자동 설치하지 않습니다.`);
  const result = spawnSync(process.execPath, [entry, ...args], {
    cwd: root, stdio: 'inherit', shell: false,
    // 테스트 API의 업로드도 작업 트리 안으로 한정한다.
    env: { ...process.env, DARACL_UPLOAD_DIR: join(root, 'test-results', 'uploads') },
  });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`${tool} 실패 (종료 코드 ${result.status}, 신호 ${result.signal ?? '없음'})`);
}

export function compileStyles() {
  const sass = require('sass');
  const files = readdirSync(join(root, 'style')).filter(file => file.endsWith('.scss') && !file.startsWith('_'));
  if (!files.length) throw new Error('style/에 SCSS 진입점이 없습니다.');
  const warnings = [];
  for (const file of files) {
    sass.compile(join(root, 'style', file), {
      loadPaths: [join(root, 'node_modules')],
      logger: { warn: message => warnings.push(message), debug: () => {} },
    });
  }
  return { entries: files, warnings };
}

function audit(json) {
  const findings = [];
  const add = (level, message) => findings.push({ level, message });
  let pkg;
  try { pkg = JSON.parse(read('package.json')); }
  catch (error) { add('error', `package.json: ${error.message}`); }
  if (pkg) {
    for (const field of ['name', 'version', 'license', 'main', 'module', 'types', 'exports', 'files']) {
      if (!pkg[field]) add('error', `package.json 필수 항목 누락: ${field}`);
    }
    for (const script of ['build', 'build:escjs', 'build:umd', 'build:tsc', 'test', 'test:all']) {
      if (!pkg.scripts?.[script]) add('error', `스크립트 누락: ${script}`);
    }
    if (Object.values(pkg.scripts ?? {}).some(command => /\byarn\b/.test(command)) && existsSync(join(root, 'package-lock.json'))) {
      add('warning', 'npm lockfile과 yarn 호출 스크립트가 혼재합니다. 하네스는 현재 Node로 도구를 직접 실행합니다.');
    }
    for (const [name, value] of Object.entries({ ...pkg.dependencies, ...pkg.devDependencies })) {
      if (value.startsWith('file:')) add('warning', `로컬 파일 의존성: ${name}=${value}`);
    }
    const effects = pkg.sideEffects;
    if (!Array.isArray(effects) || !effects.includes('./dist/*.umd.js') || !effects.includes('./dist/*.css')) {
      add('warning', 'sideEffects의 배포 UMD·CSS 패턴을 확인하세요.');
    }
    for (const [field, value] of Object.entries({ main: pkg.main, module: pkg.module, types: pkg.types })) {
      if (typeof value === 'string' && !existsSync(join(root, value))) add('warning', `${field} 대상이 없습니다 (배포 전 전체 빌드 필요): ${value}`);
    }
  }
  for (const name of ['typescript/bin/tsc', 'jest/bin/jest', 'ts-jest', 'jest-environment-jsdom', 'vite/bin/vite.js', 'sass', 'rollup']) {
    if (!installed(name)) add('error', `설치되지 않은 검증 도구: ${name}`);
  }
  if (!installed('jest-html-reporter')) add('warning', 'HTML reporter 미설치. 하네스 테스트는 --reporters=default를 사용합니다.');
  if (installed('typescript')) {
    const ts = require('typescript');
    const parsed = ts.parseConfigFileTextToJson('tsconfig.json', read('tsconfig.json'));
    if (parsed.error) add('error', 'tsconfig.json 파싱 실패');
    else {
      if (parsed.config.compilerOptions?.strict !== true) add('error', 'tsconfig의 strict는 true여야 합니다.');
      for (const [alias, expected] of Object.entries({ '@/*': 'src/*', '@t/*': 'src/types/*' })) {
        if (!parsed.config.compilerOptions?.paths?.[alias]?.includes(expected)) add('error', `tsconfig 별칭 불일치: ${alias}`);
      }
      const jest = require(join(root, 'jest.config.js'));
      for (const alias of ['^@/(.*)$', '^@t/(.*)$']) {
        if (!jest.moduleNameMapper?.[alias]) add('error', `Jest 별칭 누락: ${alias}`);
      }
    }
  }
  const sources = ['src', 'api', 'test', 'style', 'scripts'].flatMap(folder => walk(join(root, folder)));
  for (const file of sources.filter(file => /\.(ts|js|mjs|scss)$/.test(file))) {
    const content = readFileSync(file, 'utf8');
    const name = relative(root, file).replaceAll('\\', '/');
    if (/^(<{7}|={7}|>{7})(?:\s|$)/m.test(content)) add('error', `충돌 표시: ${name}`);
    // 기존 코드도 위치만 보고한다. 자동 변환은 하지 않는다.
    if (/^[ \t]*(?:\/\/|\/\*)\s*@ts-(?:ignore|nocheck|expect-error)\b/m.test(content)) add('warning', `타입 검사 우회 주석: ${name}`);
  }
  try {
    const result = compileStyles();
    for (const warning of result.warnings) add('warning', `Sass: ${warning.split('\n')[0]}`);
    add('info', `SCSS 컴파일 통과: ${result.entries.join(', ')}`);
  } catch (error) { add('error', `SCSS 검증 실패: ${error.message}`); }
  const report = { project: pkg?.name ?? 'corejs', sourceFiles: sources.length, findings,
    errors: findings.filter(item => item.level === 'error').length,
    warnings: findings.filter(item => item.level === 'warning').length };
  if (json) console.log(JSON.stringify(report, null, 2));
  else {
    for (const finding of findings) console.log(`[${finding.level}] ${finding.message}`);
    console.log(`점검: 오류 ${report.errors}건, 경고 ${report.warnings}건, 파일 ${sources.length}개`);
  }
  if (report.errors) throw new Error(`점검 오류 ${report.errors}건`);
}

function test(files) {
  const args = ['--runInBand', '--reporters=default'];
  if (files.length) {
    for (const file of files) {
      const full = resolve(root, file);
      const rel = relative(join(root, 'test'), full);
      if (!rel || rel.startsWith('..') || isAbsolute(rel) || !full.endsWith('.test.ts') || !existsSync(full)) {
        throw new Error(`test/ 아래의 실제 .test.ts 파일만 지정하세요: ${file}`);
      }
    }
    args.push('--runTestsByPath', ...files.map(file => resolve(root, file)));
  } else args.push('--testPathIgnorePatterns=test/ajax/ajax-.*.test.ts');
  run('jest/bin/jest', args);
}

function build() {
  const directory = artifactDirectory();
  console.log(`빌드 검증 산출물: ${directory}`);
  for (const mode of ['production', 'development']) {
    for (const [config, format] of [['vite.config.js', 'es-cjs'], ['vite.config.umd.js', 'umd']]) {
      run('vite/bin/vite.js', ['build', '--config', config, '--mode', mode, '--outDir', join(directory, `${format}-${mode}`)]);
    }
  }
  run('typescript/bin/tsc', ['--emitDeclarationOnly', '--declarationDir', join(directory, 'types'), '--outDir', join(directory, 'types')]);
  return directory;
}

async function treeShake(directory) {
  const { rollup } = require('rollup');
  const entry = join(directory, 'es-cjs-production', 'index.min.js').replaceAll('\\', '/');
  const bundle = await rollup({
    input: 'corejs-consumer',
    plugins: [{ name: 'corejs-consumer', resolveId: id => id === 'corejs-consumer' ? id : null,
      load: id => id === 'corejs-consumer' ? `import { isString } from ${JSON.stringify(entry)}; console.log(isString(window.value));` : null }],
  });
  try {
    const { output } = await bundle.generate({ format: 'es' });
    const code = output.filter(item => item.type === 'chunk').map(item => item.code).join('\n');
    writeFileSync(join(directory, 'consumer.js'), code);
    if (/XMLHttpRequest|data:image\/gif|window\.Daracl/.test(code) || Buffer.byteLength(code) > 2048) {
      throw new Error('isString 소비자 번들에 불필요한 코드가 남습니다. consumer.js를 확인하세요.');
    }
    console.log(`ESM 트리셰이킹 통과: ${Buffer.byteLength(code)}바이트`);
  } finally { await bundle.close(); }
}

async function main() {
  const [command = 'help', ...args] = process.argv.slice(2);
  if (command === 'help') {
    console.log('node scripts/harness.mjs audit [--json] | typecheck | scss | test [test/파일.test.ts ...] | build | verify');
    return;
  }
  if (command !== 'test' && args.length && !(command === 'audit' && args.length === 1 && args[0] === '--json')) {
    throw new Error('지원하지 않는 인자입니다. help를 확인하세요.');
  }
  switch (command) {
    case 'audit': audit(args.includes('--json')); break;
    case 'typecheck': run('typescript/bin/tsc', ['--noEmit', '--emitDeclarationOnly', 'false']); break;
    case 'scss': console.log(compileStyles()); break;
    case 'test': test(args); break;
    case 'build': await treeShake(build()); break;
    case 'verify':
      audit(false);
      run('typescript/bin/tsc', ['--noEmit', '--emitDeclarationOnly', 'false']);
      test([]);
      await treeShake(build());
      console.log('전체 검증 통과 (배포 패키징·실제 브라우저 수동 검증 제외)');
      break;
    default: throw new Error(`알 수 없는 명령: ${command}`);
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(error => { console.error(error.message); process.exitCode = 1; });
}
