import { isString } from "./isString";

/**
 * 숫자 여부 체크
 *
 * @param {*} value
 * @param {(boolean | undefined)} [typeIgnore=false]
 * @returns {boolean}
 */
export function isNumeric(value: any, typeIgnore: boolean | undefined = false): boolean {
  if (typeIgnore === true) return !Number.isNaN(value);

  return (typeof value === "number" || (isString(value) && value.trim() !== "" && !isNaN(parseFloat(value)))) && isFinite(Number(value));
}
