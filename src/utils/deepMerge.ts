import { isArray } from "./isArray";
import { isPlainObject } from "./isPlainObject";

// null prototype 객체도 병합하되 클래스·DOM·함수의 내부 상태는 순회하지 않습니다.
const isMergeObject = (value: any): boolean => isPlainObject(value) ||
  (value !== null && typeof value === "object" && Object.getPrototypeOf(value) === null);
const hasOwn = (value: object, key: string): boolean => Object.prototype.hasOwnProperty.call(value, key);

function setOwn(target: object, key: string, value: any): void {
  Object.defineProperty(target, key, { value, enumerable: true, writable: true, configurable: true });
}

/** 소스별 참조 표와 작업 목록으로 순환 참조와 깊은 중첩을 처리합니다. */
function mergeSource(target: any, source: any, excludeKeys: Set<string>): void {
  const copies = new WeakMap<object, any>();
  const tasks: (() => void)[] = [];

  function copy(value: any, current?: any): any {
    if (value === null || typeof value !== "object") return value;
    if (copies.has(value)) return copies.get(value);
    let result: any;
    if (isArray(value)) {
      result = isArray(current) ? current : [];
      tasks.push(() => mergeArray(result, value));
    } else if (isMergeObject(value)) {
      result = isMergeObject(current) ? current : Object.create(Object.getPrototypeOf(value));
      tasks.push(() => mergeObject(result, value));
    } else if (value instanceof Date) {
      result = new Date(value.getTime());
    } else if (value instanceof RegExp) {
      result = new RegExp(value.source, value.flags);
      result.lastIndex = value.lastIndex;
    } else if (value instanceof Map) {
      result = new Map();
      tasks.push(() => value.forEach((item, key) => result.set(copy(key), copy(item))));
    } else if (value instanceof Set) {
      result = new Set();
      tasks.push(() => value.forEach(item => result.add(copy(item))));
    } else {
      // DOM·AbortSignal·사용자 클래스 등은 내부 구조를 추측하지 않고 참조를 유지합니다.
      return value;
    }
    copies.set(value, result);
    return result;
  }

  function mergeObject(dst: any, src: any): void {
    for (const key of Object.keys(src)) {
      if (excludeKeys.has(key) || key === "__proto__" || key === "constructor" || key === "prototype") continue;
      const value = src[key];
      if (value === undefined) continue;
      setOwn(dst, key, copy(value, hasOwn(dst, key) ? dst[key] : undefined));
    }
  }

  function mergeArray(dst: any[], src: any[]): void {
    const seen = new Set(dst);
    for (const value of src) {
      const item = copy(value);
      // 객체 요소는 내용 비교로 제거하지 않으며 NaN 중복도 기존처럼 보존합니다.
      if ((value !== null && typeof value === "object") || Number.isNaN(item) || !seen.has(item)) {
        seen.add(item);
        dst.push(item);
      }
    }
  }

  copies.set(source, target);
  if (isArray(source) && isArray(target)) tasks.push(() => mergeArray(target, source));
  else tasks.push(() => mergeObject(target, source));
  while (tasks.length) tasks.pop()!();
}

/**
 * 깊은 병합 (objectDeepMerge)
 *
 * - 여러 객체를 순서대로 병합하여 새 객체를 반환합니다.
 * - 일반 객체끼리 병합하고, 배열끼리는 원시 값 중복을 제거하여 합칩니다(NaN 제외).
 * - 배열과 객체 등 타입이 다르면 뒤의 값으로 교체합니다.
 * - Date·RegExp·Map·Set은 복사하고 함수·DOM·기타 클래스 인스턴스는 참조를 유지합니다.
 * - 소스 내부의 순환 참조와 공유 참조를 유지합니다.
 * - undefined 값은 무시됩니다.
 * - 마지막 인자로 {_excludeKeys: string[]} 형태의 옵션 객체를 전달하면
 *   해당 키들은 병합에서 제외됩니다 (첫 번째 소스에는 제외 적용되지 않음).
 *
 * 사용 예:
 * - 기본 병합
 *   const out = objectDeepMerge(
 *     { a: 1, c: 3 },
 *     { b: 2, a: 10 }
 *   );
 *   // out -> { a: 10, b: 2, c: 3 }
 *
 * - 키 제외 (_excludeKeys)
 *   const out2 = objectDeepMerge(
 *     { a: 1, c: 3 },
 *     { b: 2, a: 10 },
 *     { _excludeKeys: ['a'] }
 *   );
 *   // out2 -> { a: 1, b: 2, c: 3 } // 'a' 는 두번째 소스에서 덮어쓰지 않음
 *
 * - null / 함수 처리
 *   objectDeepMerge({ x: 1 }, { x: null }) -> { x: null }
 *   objectDeepMerge({ f: () => 1 }, { f: () => 2 }) -> second f replaces first
 *
 * 주의:
 * - exclude 키는 마지막 인자에 _excludeKeys 배열로 전달해야 하며,
 *   첫 번째 소스(초기값)에는 제외 규칙이 적용되지 않습니다(초기값을 보존하도록 설계).
 *
 * @param {...any[]} values - 병합할 값들. 마지막에 {_excludeKeys: string[]} 옵션을 넣을 수 있음.
 * @returns {object} 병합된 새 객체
 */
export function objectDeepMerge(...values: any[]): any {
  if (values.length < 1) {
    return values;
  }

  let excludeKeys = new Set<string>();
  let sources = values; 
  const last = values[values.length - 1];
  if (isMergeObject(last) && hasOwn(last, "_excludeKeys") && isArray(last._excludeKeys)) {
    excludeKeys = new Set<string>(last._excludeKeys.map(String));
    sources = values.slice(0, -1);
  }
  
  let result = {};

  for (let index = 0; index < sources.length; index++) {
    const value = sources[index];
    if (isArray(value) || isMergeObject(value)) {
      mergeSource(result, value, index === 0 ? new Set<string>() : excludeKeys);
    }
  }

  return result;
}


/** 배열들을 깊게 복사하여 합칩니다. 원시 값은 중복 제거하고 NaN·객체 요소는 보존합니다. */
export function arrayDeepMerge(...values: any[]): any {
  if (values.length < 1) {
    return values;
  }
  
  let source:any[] = [];
  let excludeKeys = new Set<string>();
  
  for (let value of values) {
    if (!isArray(value)) continue;
    mergeSource(source, value, excludeKeys);
  }

  return source;
}
