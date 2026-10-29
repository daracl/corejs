import { isFunction } from "./isFunction";

/**
 * 일반 객체와 null prototype 객체인지 확인합니다. 다른 iframe의 일반 객체도 포함합니다.
 * 사용자 정의 프로토타입과 클래스 인스턴스는 제외하며 Symbol.toStringTag는 조회하지 않습니다.
 *
 * @param value - 확인할 값
 * @returns 순수 객체이면 true, 그렇지 않으면 false
 */
export function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== "object") return false;
  const prototype = Object.getPrototypeOf(value);
  if (prototype === null || prototype === Object.prototype) return true;
  if (Object.getPrototypeOf(prototype) !== null) return false;
  const constructor = Object.getOwnPropertyDescriptor(prototype, "constructor")?.value;
  return isFunction(constructor) &&
    Object.getOwnPropertyDescriptor(constructor, "prototype")?.value === prototype &&
    Function.prototype.toString.call(constructor) === Function.prototype.toString.call(Object);
}
