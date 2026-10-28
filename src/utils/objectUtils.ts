import { isUndefined } from "./isUndefined";
import { isArray } from "./isArray";
import { isPlainObject } from "./isPlainObject";
import { isFunction } from "./isFunction";
import { isString } from "./isString";
import { deepCopy } from "./deepCopy";
import { isBoolean } from "./typeChecks";

/** JSON 직렬화 규칙으로 복사합니다. undefined 자체는 그대로 반환합니다. */
export function cloneJson<T>(value: T): T {
  return isUndefined(value) ? value : JSON.parse(JSON.stringify(value)) as T;
}

/** 함수는 보존하고 객체·배열의 undefined는 제외하는 설정 복사입니다. */
export function cloneConfig<T>(value: T): T {
  if (isFunction(value)) return value;
  if (isArray(value)) return value.filter(item => !isUndefined(item)).map(item => cloneConfig(item)) as T;
  if (isPlainObject(value)) {
    const result = {};
    for (const [key, item] of Object.entries(value as object)) {
      if (isUndefined(item)) continue;
      Object.defineProperty(result, key, { value: cloneConfig(item), enumerable: true, configurable: true, writable: true });
    }
    return result as T;
  }
  return cloneJson(value);
}

/** JSON 문자열 기준으로 값을 비교합니다. 객체 키 순서도 비교에 포함됩니다. */
export function jsonEqual(a: unknown, b: unknown): boolean {
  return a === b || JSON.stringify(a) === JSON.stringify(b);
}

/** 객체·배열은 내용, 함수는 참조로 비교합니다. 누락된 키와 undefined는 동일하게 봅니다. */
export function sameValue(a: unknown, b: unknown): boolean {
  const seen = new WeakMap<object, WeakSet<object>>();
  const compare = (left: unknown, right: unknown): boolean => {
    if (Object.is(left, right)) return true;
    const arrays = isArray(left) && isArray(right);
    if (!arrays && !(isPlainObject(left) && isPlainObject(right))) return false;
    const l = left as object, r = right as object;
    if (seen.get(l)?.has(r)) return true;
    if (!seen.has(l)) seen.set(l, new WeakSet());
    seen.get(l)!.add(r);
    if (arrays) {
      const la = left as unknown[], ra = right as unknown[];
      return la.length === ra.length && la.every((item, index) => compare(item, ra[index]));
    }
    const lo = left as Record<string, unknown>, ro = right as Record<string, unknown>;
    return [...new Set([...Object.keys(lo), ...Object.keys(ro)])].every(key => compare(
      Object.prototype.hasOwnProperty.call(lo, key) ? lo[key] : undefined,
      Object.prototype.hasOwnProperty.call(ro, key) ? ro[key] : undefined,
    ));
  };
  return compare(a, b);
}

/** JSON 객체 문자열을 해석합니다. 잘못된 문자열은 빈 객체로 처리합니다. */
export function parseConfigString(value: unknown): unknown {
  if (!isString(value)) return value;
  try {
    const parsed: unknown = JSON.parse(value);
    return isPlainObject(parsed) ? parsed : {};
  } catch { return {}; }
}

/** boolean 축약 옵션을 enabled 객체로 바꾸며 객체 옵션은 core deepCopy로 복사합니다. */
export function toOptionObject<T extends object>(value: boolean | T | undefined): Partial<T> & { enabled?: boolean } {
  if (isBoolean(value)) return { enabled: value } as Partial<T> & { enabled?: boolean };
  return isPlainObject(value) ? deepCopy(value) : {};
}
