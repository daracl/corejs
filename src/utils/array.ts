import { isArray } from "./isArray";
import { isNil } from "./isNil";

/** 첫 번째 일치 항목을 제거한 새 배열을 반환합니다. */
export function removeItem<T>(array: readonly T[], item: T): T[] {
  const index = array.indexOf(item);
  return index < 0 ? [...array] : [...array.slice(0, index), ...array.slice(index + 1)];
}

/** 배열의 지정 범위를 얕게 복사합니다. */
export function arrayCopy<T>(array: readonly T[], start?: number, end?: number): T[] {
  return isArray(array) ? array.slice(start, end) : [];
}

/** 원본 배열에 삽입하고 제한 길이 초과 시 앞의 항목을 제거합니다. */
export function insertToArray<T>(targetArray: T[], values: T | T[], isBefore = false, rowIndex?: number, limit = Infinity): T[] {
  const items: T[] = isArray(values) ? values : [values];
  if (rowIndex === undefined) {
    if (isBefore) targetArray.unshift(...items);
    else targetArray.push(...items);
  } else {
    // 범위를 벗어나거나 숫자가 아닌 위치는 배열 범위로 보정한다(음수가 끝에서부터 계산되지 않도록)
    const position = Number.isFinite(rowIndex) ? Math.floor(isBefore ? rowIndex - 1 : rowIndex) : targetArray.length;
    targetArray.splice(Math.min(Math.max(position, 0), targetArray.length), 0, ...items);
  }
  if (Number.isFinite(limit) && targetArray.length > Math.max(0, limit)) {
    targetArray.splice(0, targetArray.length - Math.max(0, Math.floor(limit)));
  }
  return targetArray;
}

/** 원본 배열의 항목을 이동합니다. 유효하지 않은 인덱스는 무시합니다. */
export function moveItem<T>(array: T[], fromIndex: number, toIndex: number): T[] {
  if (!Number.isInteger(fromIndex) || !Number.isInteger(toIndex) || fromIndex < 0 || fromIndex >= array.length || toIndex < 0 || toIndex >= array.length) return array;
  array.splice(toIndex, 0, array.splice(fromIndex, 1)[0]);
  return array;
}

/** 중복 없는 연속 정수 배열인지 검사합니다. 빈 배열은 false입니다. */
export function isSequential(array: readonly number[]): boolean {
  if (!array.length) return false;
  const values = new Set<number>();
  let min = Infinity;
  let max = -Infinity;
  for (const value of array) {
    if (!Number.isInteger(value) || values.has(value)) return false;
    values.add(value);
    min = Math.min(min, value);
    max = Math.max(max, value);
  }
  return max - min + 1 === array.length;
}

/** 순서와 중복 개수를 고려해 비교하며, ignoreOrder이면 순서만 무시합니다. */
export function arrayEquals<T, U = T>(a: readonly T[], b: readonly T[], ignoreOrder = false, selector?: (item: T) => U): boolean {
  if (a === b) return true;
  if (a.length !== b.length) return false;
  const select = selector ?? ((item: T) => item as unknown as U);
  if (!ignoreOrder) return a.every((item, index) => select(item) === select(b[index]));
  const counts = new Map<U, number>();
  for (const item of a) {
    const value = select(item);
    // 순서 비교와 동일하게 NaN은 자기 자신과도 같지 않습니다.
    if (typeof value === "number" && Number.isNaN(value)) return false;
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  for (const item of b) {
    const value = select(item);
    const count = counts.get(value);
    if (!count) return false;
    if (count === 1) counts.delete(value);
    else counts.set(value, count - 1);
  }
  return counts.size === 0;
}

/** 배열은 그대로 반환하고 그 외 값은 구분자로 나눠 공백·빈 항목을 정리합니다. */
export function toListValue(value: unknown, delimiter = ","): unknown[] {
  if (isNil(value)) return [];
  if (isArray(value)) return value;
  return String(value).split(delimiter || ",").map(item => item.trim()).filter(Boolean);
}
