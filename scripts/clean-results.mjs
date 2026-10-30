// test-results/ 의 오래된 산출물(빌드 검증, 패키징 검증, 커버리지, 임시 폴더 등)을 정리한다.
// 모두 다시 만들 수 있는 Git 무시 대상이며, 하네스 build·verify 와 test:package 는 실행할 때마다 자동으로 정리를 호출한다.
import { existsSync, lstatSync, readdirSync, rmSync, unlinkSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const DAY = 24 * 60 * 60 * 1000;

export const DEFAULT_RETENTION_DAYS = 7;
/** 개발 API 가 사용하는 기본 업로드 폴더입니다. 서버가 실행 중일 수 있고 자체 정리(pruneUploads)가 있어 통째로 지우지 않습니다. */
export const PROTECTED_ENTRIES = new Set(['uploads']);

/** 폴더 크기를 바이트로 계산합니다. 링크는 따라가지 않습니다. */
function sizeOf(path) {
  const stat = lstatSync(path);
  if (stat.isSymbolicLink() || !stat.isDirectory()) return stat.size;
  return readdirSync(path).reduce((total, name) => total + sizeOf(join(path, name)), 0);
}

export function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)}KB`;
  if (bytes < 1024 ** 3) return `${(bytes / 1024 ** 2).toFixed(1)}MB`;
  return `${(bytes / 1024 ** 3).toFixed(2)}GB`;
}

/**
 * test-results/ 바로 아래 항목 중 days 일보다 오래된 것(all 이면 전부)을 삭제하고 결과를 반환합니다.
 * - 항목의 수정 시각 기준이며, 폴더 안쪽은 따로 보지 않고 통째로 삭제합니다.
 * - PROTECTED_ENTRIES 는 건드리지 않습니다. 링크는 따라가지 않고 링크 자체만 지웁니다.
 * - dryRun 이면 삭제하지 않고 대상만 계산합니다.
 */
export function cleanResults({ projectRoot = root, days = DEFAULT_RETENTION_DAYS, all = false, dryRun = false, now = Date.now() } = {}) {
  if (!all && (!Number.isInteger(days) || days < 1)) throw new Error('--days는 1 이상의 정수여야 합니다.');
  const base = join(projectRoot, 'test-results');
  const result = { removed: [], kept: [], freedBytes: 0, dryRun };
  if (!existsSync(base)) return result;
  const baseStat = lstatSync(base);
  if (baseStat.isSymbolicLink() || !baseStat.isDirectory()) throw new Error(`test-results는 실제 디렉터리여야 합니다: ${base}`);

  const limit = now - days * DAY;
  for (const entry of readdirSync(base, { withFileTypes: true })) {
    const full = join(base, entry.name);
    if (PROTECTED_ENTRIES.has(entry.name)) { result.kept.push({ name: entry.name, reason: 'protected' }); continue; }
    const stat = lstatSync(full);
    if (!all && stat.mtimeMs >= limit) { result.kept.push({ name: entry.name, reason: 'recent' }); continue; }
    const bytes = sizeOf(full);
    if (!dryRun) {
      if (entry.isSymbolicLink()) unlinkSync(full);
      else rmSync(full, { recursive: true, force: true });
    }
    result.removed.push({ name: entry.name, bytes, ageDays: Math.max(0, Math.floor((now - stat.mtimeMs) / DAY)) });
    result.freedBytes += bytes;
  }
  return result;
}

/**
 * 환경 변수 DARACL_RESULTS_RETENTION_DAYS(기본 7)일보다 오래된 산출물을 정리합니다. 0 또는 off 면 정리하지 않습니다.
 * 정리 실패가 빌드·검증을 막지 않도록 오류는 경고로만 남깁니다.
 */
export function autoCleanResults({ projectRoot = root, env = process.env, log = console.log } = {}) {
  const raw = (env.DARACL_RESULTS_RETENTION_DAYS ?? '').trim().toLowerCase();
  if (raw === '0' || raw === 'off') return null;
  const parsed = Number(raw);
  const days = raw !== '' && Number.isInteger(parsed) && parsed >= 1 ? parsed : DEFAULT_RETENTION_DAYS;
  try {
    const result = cleanResults({ projectRoot, days });
    if (result.removed.length) log(`test-results: ${days}일이 지난 산출물 ${result.removed.length}개(${formatBytes(result.freedBytes)})를 정리했습니다.`);
    return result;
  } catch (error) {
    console.warn(`test-results 자동 정리를 건너뜁니다: ${error.message}`);
    return null;
  }
}

function parseArgs(args) {
  const options = { days: DEFAULT_RETENTION_DAYS, all: false, dryRun: false };
  let explicitDays = false;
  for (const arg of args) {
    if (arg === '--all') options.all = true;
    else if (arg === '--dry-run') options.dryRun = true;
    else if (/^--days=\d+$/.test(arg)) { options.days = Number(arg.slice('--days='.length)); explicitDays = true; }
    else throw new Error(`지원하지 않는 인자입니다: ${arg}\n사용법: node scripts/clean-results.mjs [--days=N | --all] [--dry-run]`);
  }
  if (options.all && explicitDays) throw new Error('--all과 --days는 함께 쓸 수 없습니다.');
  return options;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const options = parseArgs(process.argv.slice(2));
    const result = cleanResults(options);
    const verb = result.dryRun ? '삭제 대상' : '삭제';
    for (const item of result.removed) console.log(`${verb}: ${item.name} (${formatBytes(item.bytes)}, ${item.ageDays}일 전)`);
    const scope = options.all ? '전체' : `${options.days}일 초과`;
    console.log(`${result.dryRun ? '[dry-run] ' : ''}test-results ${scope} 항목 ${result.removed.length}개 ${verb}, ${formatBytes(result.freedBytes)} 확보, ${result.kept.length}개 유지`);
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
