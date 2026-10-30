import { isNil } from "./isNil";
import { isNumber } from "./typeChecks";
import { isFunction } from "./isFunction";
import { toNumber, formatNumber } from "./number";
import { leftPad, escapeHTML } from "./str";
import { escapeRegExp, maxRegexTextLength } from "./regex";

export interface SortOption { field: string; direction: "asc" | "desc"; }
export interface SearchOptions { matchCase?: boolean; matchWholeWord?: boolean; useRegex?: boolean; }
export interface DisplayFormat { type: "number" | "currency" | "date"; format?: string; prefix?: string; suffix?: string; locale?: string; }
export type SummaryExpression<T> = "sum" | "average" | "min" | "max" | "count" | ((rows: T[]) => unknown);

/** 숫자끼리는 숫자, 그 외에는 문자열로 비교합니다. nullsLast는 방향과 무관합니다. */
export function compareValues(a: unknown, b: unknown, ascending = true, nullsLast = false): number {
  const nullA = isNil(a);
  const nullB = isNil(b);
  if (nullA !== nullB) return nullsLast ? (nullA ? 1 : -1) : ascending ? (nullA ? 1 : -1) : (nullA ? -1 : 1);
  if (nullA) return 0;
  const result = isNumber(a) && isNumber(b) ? a - b : String(a).localeCompare(String(b));
  return ascending ? result : -result;
}

/** 복수 필드로 정렬한 새 배열을 반환합니다. 같은 값의 순서는 유지합니다. */
export function sortRows<T extends object>(rows: readonly T[], sorts: readonly SortOption[], nullsLast = false): T[] {
  return [...rows].sort((a, b) => {
    for (const sort of sorts) {
      const result = compareValues((a as Record<string, unknown>)[sort.field], (b as Record<string, unknown>)[sort.field], sort.direction === "asc", nullsLast);
      if (result !== 0) return result;
    }
    return 0;
  });
}

/**
 * 검색 함수를 만듭니다. 잘못되었거나 길이 200자를 넘거나 역추적 위험이 있는 정규식은 리터럴로 검색합니다.
 * 정규식 검색은 패턴의 반복 개수에 따른 텍스트 길이 상한(1~3개: 10000/1000/200자, 반복 없음: 10000자)을 넘는 텍스트에는 적용하지 않고 리터럴로 검색합니다.
 */
export function createMatcher(keyword: string, options: SearchOptions = {}): (text: string) => boolean {
  const boundary = "[\\s.,;:!?()\\[\\]{}\"']";
  const build = (source: string): RegExp => new RegExp(options.matchWholeWord ? `(?:^|${boundary})(?:${source})(?=$|${boundary})` : source, options.matchCase ? "" : "i");
  const literal = build(escapeRegExp(keyword));
  let regexp = literal;
  let maxTextLength = 0;
  if (options.useRegex && keyword.length <= 200) {
    try {
      regexp = build(keyword);
      maxTextLength = maxRegexTextLength(keyword);
    } catch { /* 리터럴 검색으로 대체합니다. */ }
  }
  return text => (maxTextLength > 0 && text.length <= maxTextLength ? regexp : literal).test(text);
}

/** 지정한 필드 중 하나라도 검색 조건과 일치하는지 검사합니다. */
export function matchRow(row: object, fields: readonly string[], matcher: (text: string) => boolean): boolean {
  return fields.some(field => {
    const value = (row as Record<string, unknown>)[field];
    return !isNil(value) && matcher(String(value));
  });
}

/** 텍스트를 이스케이프한 뒤 한 구간을 강조합니다. 강조 태그는 텍스트용 태그만 허용합니다. */
export function highlightSingleMatch(text: string, match: { start: number; end: number }, highlightTag = "mark"): string {
  if (!["mark", "span", "b", "strong", "em", "i"].includes(highlightTag)) throw new TypeError("Invalid highlight tag");
  const start = Math.max(0, Math.min(text.length, Math.floor(match.start)));
  const end = Math.max(start, Math.min(text.length, Math.floor(match.end)));
  return `${escapeHTML(text.slice(0, start))}<${highlightTag}>${escapeHTML(text.slice(start, end))}</${highlightTag}>${escapeHTML(text.slice(end))}`;
}

/** 로컬 시간 기준 YYYY·MM·DD·HH·mm·ss 패턴을 적용합니다. */
export function formatDate(date: Date, pattern: string): string {
  const pad = (value: number) => leftPad(value, 2);
  const tokens: Record<string, string> = { YYYY: String(date.getFullYear()), MM: pad(date.getMonth() + 1), DD: pad(date.getDate()), HH: pad(date.getHours()), mm: pad(date.getMinutes()), ss: pad(date.getSeconds()) };
  return pattern.replace(/YYYY|MM|DD|HH|mm|ss/g, token => tokens[token]);
}

/** 숫자·통화·날짜 표시 형식을 적용합니다. 변환 실패 시 원래 문자열을 반환합니다. */
export function formatValue(value: unknown, format?: DisplayFormat): string {
  if (isNil(value) || value === "") return "";
  if (!format) return String(value);
  const prefix = format.prefix ?? "";
  const suffix = format.suffix ?? "";
  if (format.type === "date") {
    const date = value instanceof Date ? value : new Date(isNumber(value) ? value : String(value));
    return Number.isNaN(date.getTime()) ? String(value) : `${prefix}${formatDate(date, format.format ?? "YYYY-MM-DD")}${suffix}`;
  }
  const number = toNumber(value);
  if (number === null) return String(value);
  const text = format.type === "currency" ? new Intl.NumberFormat(format.locale, { style: "currency", currency: format.format ?? "KRW" }).format(number) : formatNumber(number, format.format ?? "0,0");
  return `${prefix}${text}${suffix}`;
}

/** 숫자 필드 요약을 단일 순회로 계산합니다. 대상이 없으면 null입니다. */
export function computeSummary<T extends object>(rows: T[], field: string, expression: SummaryExpression<T>): unknown {
  if (isFunction(expression)) return expression(rows);
  if (expression === "count") return rows.length;
  let sum = 0, min = Infinity, max = -Infinity, count = 0;
  for (const row of rows) {
    const value = (row as Record<string, unknown>)[field];
    if (!isNumber(value)) continue;
    count++;
    sum += value;
    min = Math.min(min, value);
    max = Math.max(max, value);
  }
  return !count ? null : expression === "min" ? min : expression === "max" ? max : expression === "average" ? sum / count : sum;
}

/** 기존 Grid의 avg·not valid 계약을 공통 요약 함수로 연결합니다. */
export function calcSummary(items: object[], mode: string, itemKey: string): number | string {
  if (!["count", "min", "max", "sum", "avg"].includes(mode)) return `${mode} not valid`;
  return computeSummary(items, itemKey, (mode === "avg" ? "average" : mode) as SummaryExpression<object>) as number | null ?? "not valid";
}
