import { isString } from "./isString";

/**
 * 주어진 값이 비어 있는지 확인하는 함수
 *
 * @param value - 확인할 값
 * @returns 비어 있으면 true, 그렇지 않으면 false
 */
export function isBlank(value: any): boolean {
  return value === null || value === undefined || (isString(value) && value.trim() === "");
}
