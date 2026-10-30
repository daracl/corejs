import { isString } from "./isString";
import { isNil } from "./isNil";

/** 탭·줄바꿈·큰따옴표가 있는 문자열을 인용 셀로 변환합니다. */
export function escapeCellValue<T>(value: T): T | string {
  return isString(value) && /["\n\r\t]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

/** 인용된 탭·여러 줄·큰따옴표를 포함한 클립보드 텍스트를 해석합니다. */
export function parseClipboard(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [], cell = "", inQuotes = false, rowEnded = false;
  text = text.replace(/(\r?\n){2}$/, "\n");
  for (let index = 0; index < text.length; index++) {
    const char = text[index], next = text[index + 1];
    rowEnded = false;
    if (char === '"') {
      if (inQuotes && next === '"') { cell += '"'; index++; }
      else inQuotes = !inQuotes;
    } else if (!inQuotes && char === "\t") { row.push(cell); cell = ""; }
    else if (!inQuotes && (char === "\n" || char === "\r")) {
      if (char === "\r" && next === "\n") index++;
      row.push(cell); rows.push(row); row = []; cell = ""; rowEnded = true;
    } else cell += char;
  }
  // 줄바꿈으로 끝난 텍스트(스프레드시트 복사본)는 마지막에 빈 행을 만들지 않는다
  if (!rowEnded) { row.push(cell); rows.push(row); }
  return rows;
}

/** 기존 어댑터 계약대로 셀 안의 탭·줄바꿈은 공백으로 치환해 TSV를 생성합니다. */
export function toTsv(rows: readonly object[], fields: readonly string[]): string {
  return rows.map(row => fields.map(field => {
    const value = (row as Record<string, unknown>)[field];
    return isNil(value) ? "" : String(value).replace(/[\t\n\r]/g, " ");
  }).join("\t")).join("\n");
}

/** 인용 처리가 없는 단순 TSV를 해석하고 마지막 줄바꿈 하나를 제거합니다. */
export function parseTsv(text: string): string[][] {
  return text.replace(/\r\n/g, "\n").replace(/\n$/, "").split("\n").map(line => line.split("\t"));
}
