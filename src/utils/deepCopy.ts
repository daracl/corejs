import { isArray } from "./isArray";
import { isFunction } from "./isFunction";
import { isObject } from "./isObject";
import { isPlainObject } from "./isPlainObject";

interface CopyContext {
  seen: WeakMap<object, any>;
  tasks: (() => void)[];
}

function copyProperties(source: any, target: any, context: CopyContext): void {
  for (const key of Reflect.ownKeys(source)) {
    if (key === "__proto__" || key === "constructor" || key === "prototype") continue;
    if (!Object.prototype.propertyIsEnumerable.call(source, key)) continue;
    Object.defineProperty(target, key, {
      value: copy(source[key], context), enumerable: true, writable: true, configurable: true,
    });
  }
}

function copy(source: any, context: CopyContext): any {
  if (!isObject(source) || isFunction(source)) return source;
  if (context.seen.has(source)) return context.seen.get(source);
  let result: any;
  if (isArray(source)) {
    result = new Array(source.length);
  } else if (source instanceof Date) {
    // isDate는 Invalid Date를 제외하므로 날짜 복사는 인스턴스 기준을 유지합니다.
    result = new Date(Date.prototype.getTime.call(source));
  } else if (source instanceof RegExp) {
    result = new RegExp(source.source, source.flags);
    result.lastIndex = source.lastIndex;
  } else if (source instanceof Map) {
    result = new Map();
    context.tasks.push(() => Map.prototype.forEach.call(source, (item: any, key: any) => result.set(copy(key, context), copy(item, context))));
  } else if (source instanceof Set) {
    result = new Set();
    context.tasks.push(() => Set.prototype.forEach.call(source, (item: any) => result.add(copy(item, context))));
  } else {
    const prototype = Object.getPrototypeOf(source);
    if (!isPlainObject(source)) return source;
    result = Object.create(prototype === null ? null : Object.prototype);
  }
  context.seen.set(source, result);
  context.tasks.push(() => copyProperties(source, result, context));
  return result;
}

/**
 * 배열·일반 객체·Date·RegExp·Map·Set을 복사하고 순환·공유 참조를 유지합니다.
 * 클래스·DOM 등 기타 객체와 함수는 참조를 유지합니다.
 * 문자열·Symbol의 열거 가능한 자체 속성을 복사하되 __proto__·constructor·prototype은 제외합니다.
 * 접근자는 값을 읽어 일반 속성으로 복사합니다. seen은 호출 간 참조 표를 공유할 때 사용합니다.
 */
export const deepCopy = (value: any, seen = new WeakMap<object, any>()): any => {
  const context: CopyContext = { seen, tasks: [] };
  const result = copy(value, context);
  while (context.tasks.length) context.tasks.pop()!();
  return result;
};
