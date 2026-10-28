import { isNumber } from "./typeChecks";
import { isString } from "./isString";
import { isDate } from "./isDate";

/** 쉼표를 허용해 숫자로 변환합니다. 빈 값·비유한 값은 null입니다. */
export function toNumber(value: unknown): number | null {
  if (isNumber(value)) return Number.isFinite(value) ? value : null;
  if (!isString(value) || value.trim() === "") return null;
  const number = Number(value.replace(/,/g, ""));
  return Number.isFinite(number) ? number : null;
}

/** 값을 10진수 정수로 해석합니다. 변환할 수 없으면 NaN입니다. */
export function intValue(value: unknown): number {
  return Number.parseInt(String(value), 10);
}

/** 값을 최솟값과 최댓값 사이로 제한합니다. */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/** 0,0.00 같은 패턴으로 숫자를 표시합니다. #도 고정 소수 자릿수입니다. */
export function formatNumber(value: number, pattern: string): string {
  const decimals = (pattern.split(".")[1] ?? "").replace(/[^0#]/g, "").length;
  return value.toLocaleString("en-US", {
    minimumFractionDigits: decimals, maximumFractionDigits: decimals,
    useGrouping: pattern.split(".")[0].includes(","),
  });
}

/** Date·숫자·날짜 문자열을 timestamp로 변환합니다. 실패하면 null입니다. */
export function toTimestamp(value: unknown): number | null {
  if (isDate(value)) return value.getTime();
  if (isNumber(value)) return Number.isFinite(value) ? value : null;
  if (!isString(value) || value.trim() === "") return null;
  const time = Date.parse(value);
  return Number.isNaN(time) ? null : time;
}
