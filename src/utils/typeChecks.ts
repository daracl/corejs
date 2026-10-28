import { isObject } from "./isObject";
import { isFunction } from "./isFunction";

/** 숫자 타입인지 검사합니다. 숫자 문자열과 NaN은 제외합니다. */
export function isNumber(value: unknown): value is number {
  return typeof value === "number" && !Number.isNaN(value);
}

/** boolean 타입인지 검사합니다. */
export function isBoolean(value: unknown): value is boolean {
  return typeof value === "boolean";
}

/** Promise와 함수형 thenable을 검사합니다. */
export function isThenable(value: unknown): value is PromiseLike<unknown> {
  return isObject(value) && isFunction((value as { then?: unknown }).then);
}

/** iframe을 포함한 DOM Element인지 검사합니다. */
export function isElement(value: unknown): value is Element {
  return value !== null && typeof value === "object" && (value as Node).nodeType === 1;
}

/** SVG를 제외한 HTML 요소인지 해당 문서의 생성자로 검사합니다. */
export function isHTMLElement(value: unknown): value is HTMLElement {
  if (!isElement(value)) return false;
  const constructor = value.ownerDocument?.defaultView?.HTMLElement ?? (typeof HTMLElement === "undefined" ? undefined : HTMLElement);
  return !!constructor && value instanceof constructor;
}
