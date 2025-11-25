import { isNil } from "./isNil";
import { isString } from "./isString";

/**
 * 주어진 값이 비어 있는지 확인하는 함수
 *
 * @param value - 확인할 값
 * @returns 비어 있으면 true, 그렇지 않으면 false
 */
export function isEmpty(value: any): boolean {
  // null/undefined 체크는 isNil 타입 가드를 사용
  if (isNil(value)) {
    return true; // null 또는 undefined일 경우
  }

  if (isString(value)) {
    return value.trim() === ""; // 문자열이 공백만 포함하는 경우
  }

  if (Array.isArray(value)) {
    return value.length === 0; // 배열의 길이가 0인 경우
  }

  if (typeof value === "object") {
    return Object.keys(value).length === 0; // 객체의 키가 없는 경우
  }

  return false; // 위 조건에 해당하지 않는 경우 (예: 숫자 등)
}
