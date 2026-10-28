// style/의 SCSS 수정만 확인하며 CSS 파일은 생성하지 않는다.
import { readFileSync } from 'node:fs';
import { dirname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { compileStyles } from '../../scripts/harness.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
let input;
try { input = JSON.parse(readFileSync(0, 'utf8') || '{}'); } catch { process.exit(0); }
const file = input?.tool_input?.file_path;
if (typeof file !== 'string') process.exit(0);
const path = relative(root, resolve(root, file)).replaceAll('\\', '/');
if (!path.startsWith('style/') || !path.endsWith('.scss')) process.exit(0);
try {
  const result = compileStyles();
  if (result.warnings.length) console.error(`[corejs] Sass 경고 ${result.warnings.length}건`);
} catch (error) {
  console.error(`[corejs] SCSS 검증 실패: ${error.message}`);
  process.exitCode = 2;
}
