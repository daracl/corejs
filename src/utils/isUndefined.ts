/**
 * object undefined 값 체크.
 *
 * @param {*} value
 * @returns {boolean}
 */
export function isUndefined(value: unknown): value is undefined {
  return value === undefined;
}
