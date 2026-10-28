import { isPlainObject } from "./isPlainObject";
import { isBoolean } from "./typeChecks";
import { isString } from "./isString";
import { hasProperty } from "./hasProperty";

type PlainObject = Record<string, unknown>;
export interface SetInOptions { toObject?: (value: unknown) => PlainObject; prune?: boolean; }
const copyObject = (value: unknown): PlainObject => isPlainObject(value) ? { ...value as PlainObject } : {};
const isUnsafe = (path: readonly string[]): boolean => path.some(key => ["__proto__", "constructor", "prototype"].includes(key));

/** boolean·문자열 축약 옵션을 객체로 바꾸고 객체는 얕게 복사합니다. */
export function toObjectForm(value: unknown, stringKey?: string): PlainObject {
  if (isBoolean(value)) return { enabled: value };
  if (isString(value)) return stringKey ? { [stringKey]: value } : {};
  return copyObject(value);
}

/** 중간 객체를 복사해 경로 값을 지정합니다. undefined는 삭제하며 위험 경로는 거부합니다. */
export function setIn(target: PlainObject, path: readonly string[], value: unknown, options: SetInOptions = {}): void {
  if (!path.length || isUnsafe(path)) throw new TypeError("Invalid object path");
  const nodes = [target];
  let node = target;
  for (const key of path.slice(0, -1)) {
    const current = hasProperty(node, key) ? node[key] : undefined;
    const next = (options.toObject ?? copyObject)(current);
    node[key] = next;
    nodes.push(next);
    node = next;
  }
  const last = path[path.length - 1];
  if (value === undefined) delete node[last];
  else node[last] = value;
  if (options.prune) {
    for (let index = nodes.length - 1; index > 0 && !Object.keys(nodes[index]).length; index--) delete nodes[index - 1][path[index - 1]];
  }
}

/** 객체의 own property 경로만 조회합니다. 위험 경로는 undefined입니다. */
export function getIn(target: unknown, path: readonly string[], toObject?: (value: unknown) => unknown): unknown {
  if (isUnsafe(path)) return undefined;
  let node = target;
  for (const key of path) {
    if (toObject && !isPlainObject(node)) node = toObject(node);
    if (!isPlainObject(node) || !hasProperty(node, key)) return undefined;
    node = (node as PlainObject)[key];
  }
  return node;
}

/** 데이터 앞부분에서 등장 순서대로 중복 없는 필드 목록을 반환합니다. */
export function fieldsOf(rows: readonly unknown[] | null | undefined, limit = 100): string[] {
  const fields = new Set<string>();
  for (const row of (rows ?? []).slice(0, Math.max(0, limit))) {
    if (isPlainObject(row)) Object.keys(row as object).forEach(key => fields.add(key));
  }
  return [...fields];
}

/** label(field) 형식의 필드 표시 이름을 반환합니다. */
export function fieldDisplayName(field: string, label?: string): string {
  return label && label !== field ? `${label}(${field})` : field;
}
