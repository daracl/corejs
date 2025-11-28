/**
 * object undefined 값 체크.
 *
 * @param {*} value
 * @returns {boolean}
 */
export function isUndefined(value: any): value is undefined  {
  return typeof value === "undefined";
}
