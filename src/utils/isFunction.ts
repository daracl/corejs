/**
 * 주어진 값이 함수인지 확인하는 함수
 *
 * @param value - 확인할 값
 * @returns 함수이면 true, 그렇지 않으면 false
 */
export function isFunction(value: any): value is Function  {
  return typeof value === "function" || value instanceof Function;
}
