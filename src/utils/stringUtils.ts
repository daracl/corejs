import { isNil } from "./isNil";
import { hasProperty } from "./hasProperty";
import { trim } from "./str";

/** null과 undefined는 동일하게, 나머지는 문자열 기준으로 비교합니다. */
export function isSameValue(a: unknown, b: unknown): boolean {
  return isNil(a) && isNil(b) || String(a) === String(b);
}

/** 기존 UI 프로젝트의 32비트 문자열 해시를 반환합니다. 빈 문자열은 0입니다. */
export function getHashCode(value: string): string | number {
  if (!value.length) return 0;
  let hash = 0;
  for (let index = 0; index < value.length; index++) hash = ((hash << 5) - hash + value.charCodeAt(index)) | 0;
  return String(hash).replace(/-/g, "_");
}

/** camelCase를 snake_case로 변환합니다. */
export function camelToUnderscore(value: string): string {
  return value.replace(/([a-z0-9])([A-Z])/g, "$1_$2").toLowerCase();
}

/** camelCase를 kebab-case로 변환합니다. */
export function camelToKebab(value: string): string {
  return value.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();
}

/** 문자열을 구분자로 나눕니다. */
export function stringSplit(value: string, delimiter: string): string[] {
  return (value || "").split(delimiter);
}

/** 기존 Grid 계약대로 값의 포함 여부를 토글하고 문자열 배열을 반환합니다. */
export function addValueIfMissing(currentValue: string, addValue: string | null, shouldSort = false, delimiter = ",", originValues: string[] = []): string[] {
  if (!addValue) return [];
  let items = stringSplit(currentValue, delimiter).map(trim).filter(Boolean);
  if (originValues.length) {
    const allowed = new Set(originValues.map(trim));
    items = items.filter(item => allowed.has(item));
  }
  const values = new Set(items);
  if (values.has(addValue)) values.delete(addValue);
  else values.add(addValue);
  const result = [...values];
  return shouldSort ? result.sort() : result;
}

/** {{if(key)}}...{{/if}}와 {{key}}를 해석합니다. HTML 이스케이프는 하지 않습니다. */
export function renderTemplate(template: string, data: Record<string, unknown>): string {
  const get = (key: string): unknown => hasProperty(data, key) ? data[key] : undefined;
  const result = template.replace(/{{if\(([^)]+)\)}}([\s\S]*?){{\/if}}/g, (_match, condition: string, content: string) => {
    const booleanKey = /^\s*(\w+)\s*$/.exec(condition);
    if (booleanKey) return get(booleanKey[1]) ? content : "";
    const comparison = /^\s*(\w+)\s*(==|!=|>=|<=|>|<)\s*(\d+)\s*$/.exec(condition);
    if (!comparison) return "";
    const left = get(comparison[1]);
    const right = Number(comparison[3]);
    const numeric = Number(left);
    const matched = comparison[2] === "==" ? left == right : comparison[2] === "!=" ? left != right
      : comparison[2] === ">=" ? numeric >= right : comparison[2] === "<=" ? numeric <= right
      : comparison[2] === ">" ? numeric > right : numeric < right;
    return matched ? content : "";
  });
  return result.replace(/{{\s*(\w+)\s*}}/g, (_match, key: string) => String(get(key) ?? ""));
}

/** CSS scope로 사용할 수 있는 식별자를 검증합니다. */
export function assertScope(scope: string): string {
  if (!/^[a-z][a-z0-9-]*$/i.test(scope)) throw new Error(`Invalid scope: ${scope}`);
  return scope;
}

/** 키를 data-* 속성 이름으로 바꾸며 잘못된 이름·예약 키는 제외합니다. */
export function toDataAttribute(key: string, reserved: readonly string[] = []): string | undefined {
  const kebab = camelToKebab(key);
  return /^[a-z][a-z0-9-]*$/.test(kebab) && !reserved.includes(kebab) ? `data-${kebab}` : undefined;
}
