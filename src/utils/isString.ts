/**
 * 문자열 여부 체크.
 * @param {*} value
 * @returns {boolean}
 */
export function isString(value: any): value is string {
  return typeof value === "string" || value instanceof String;
}
