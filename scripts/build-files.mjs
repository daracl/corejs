import { copyFileSync, lstatSync, mkdirSync, readdirSync, rmSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

// 프로젝트 내의 정해진 출력만 처리하며 링크 대상에는 쓰지 않습니다.
function outputPath(base, ...parts) {
  let directory = base;
  for (const part of parts) {
    directory = join(directory, part);
    try {
      if (lstatSync(directory).isSymbolicLink()) throw new Error(`출력 경로에 심볼릭 링크를 사용할 수 없습니다: ${directory}`);
    } catch (error) { if (error.code !== 'ENOENT') throw error; }
  }
  return directory;
}

function copy(source, destination) {
  mkdirSync(dirname(destination), { recursive: true });
  copyFileSync(source, destination);
}

export function buildFiles(command, projectRoot = root) {
  const dist = outputPath(projectRoot, 'dist');
  if (command === 'clean-dist') {
    rmSync(dist, { recursive: true, force: true });
  } else if (command === 'dts') {
    const walk = (directory, parts = []) => {
      for (const entry of readdirSync(directory, { withFileTypes: true })) {
        if (entry.isSymbolicLink()) continue;
        const next = [...parts, entry.name];
        if (entry.isDirectory()) walk(join(directory, entry.name), next);
        else if (entry.name.endsWith('.d.ts')) copy(join(directory, entry.name), outputPath(dist, ...next));
      }
    };
    walk(join(projectRoot, 'src'));
  } else if (command === 'unmin') {
    const source = outputPath(projectRoot, 'dist', 'unmin');
    for (const entry of readdirSync(source, { withFileTypes: true })) {
      if (entry.isFile()) copy(join(source, entry.name), outputPath(dist, entry.name));
    }
  } else if (command === 'html') {
    copy(join(projectRoot, 'public', 'index.html'), outputPath(dist, 'index.html'));
  } else if (command === 'clean-unmin') {
    rmSync(outputPath(projectRoot, 'dist', 'unmin'), { recursive: true, force: true });
  } else throw new Error(`지원하지 않는 복사 작업: ${command}`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (process.argv.length !== 3) throw new Error('복사 작업 하나만 지정하세요.');
  buildFiles(process.argv[2]);
}
