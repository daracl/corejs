import { isString } from "./isString";

/** null 또는 undefined 검사 — 타입 가드 */
export function isNil(value: any): value is null | undefined {
  return value === null || value === undefined;
}