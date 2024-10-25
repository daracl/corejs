/**
 * 주어진 값이 객체인지 확인하는 함수
 * @param value - 확인할 값
 * @returns 객체이면 true, 그렇지 않으면 false
 */
export function isObject(value: any): boolean {
  return value !== null && (typeof value === "object" || typeof value === "function");
}
