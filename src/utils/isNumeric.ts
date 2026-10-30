import { isString } from "./isString";

/**
 * 숫자 여부 체크
 *
 * @param {*} value
 * @param {(boolean | undefined)} [typeIgnore=false]
 * @returns {boolean}
 */
export function isNumeric(value: any, typeIgnore: boolean | undefined = false): boolean {
  // 타입을 따지지 않아도 숫자와 비어 있지 않은 문자열만 대상으로 한다(null·불리언·배열·빈 문자열은 Number() 가 0 이 되어도 숫자가 아니다)
  if (typeIgnore === true) return (typeof value === "number" || (isString(value) && value.trim() !== "")) && !Number.isNaN(Number(value));

  return (typeof value === "number" || (isString(value) && value.trim() !== "" && !isNaN(parseFloat(value)))) && isFinite(Number(value));
}
