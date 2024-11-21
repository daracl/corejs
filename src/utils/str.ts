import { isBlank } from "./isBlank";
import { isEmpty } from "./isEmpty";
import { isString } from "./isString";

const xssFilter = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
} as any;

const charsToReplace = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&#34;",
} as any;

/**
 *  왼쪽 오른쪽 공백 제거
 *  '  as df  ' -> 'as df'
 * @param s
 * @returns
 */
export function trim(s: string): string {
  return s.replace(/^\s+|\s+$/g, "");
}

/**
 *  왼쪽 공백 제거
 *  '  as df  ' -> 'as df  '
 * @param s
 * @returns
 */
export function leftTrim(s: string): string {
  return s.replace(/^\s+/g, "");
}

/**
 *  오른쪽 공백 제거
 *  '  as df  ' -> '  as df'
 * @param s
 * @returns
 */
export function rightTrim(s: string): string {
  return s.replace(/\s+$/g, "");
}

/**
 * 모든 공백 제거
 * '  as df  ' -> 'asdf'
 * @param s
 * @returns
 */
export function allTrim(s: string): string {
  return s.replace(/\s+/g, "");
}

/**
 * 동일한 문자열 갯수
 *
 * @param {string} str 문자열
 * @param {string} matchString 체크할 문자
 * @returns {number}
 */
export function matchCount(str: string, matchString: string): number {
  if (isBlank(str)) return 0;

  const re = new RegExp(matchString, "ig");
  const resultArray = str.match(re);
  return resultArray == null ? 0 : resultArray.length;
}

/**
 * 왼쪽 문자 채우기
 *
 * @param {string} str  문자열
 * @param {number} len    채울 자릿수
 * @param {string} [ch='0'] 채울문자
 * @returns {string}
 */
export function leftPad(str: any, len: number, ch = "0"): string {
  return pad(str, len, ch, "l");
}

/**
 * 오른쪽 문자 채우기
 *
 * @param {string} str  문자열
 * @param {number} len   채울 자릿수
 * @param {string} [ch='0'] 채울문자 default '0'
 * @returns {string}
 */
export function rightPad(str: any, len: number, ch = "0"): string {
  return pad(str, len, ch, "r");
}

/**
 * html escape
 * <div>asdfa</div> -> &lt;div&gt;test&lt;/div&gt;
 * @param {string} html
 * @returns {string}
 */
export function escapeHTML(html: string): string {
  const fn = (tag: string): string => {
    return charsToReplace[tag] || tag;
  };

  return html.replace(/[&<>"]/g, fn);
}

/**
 * xss 문자 변경.
 *
 * @param inputText text
 * @returns replace text
 *
 */
export function xss(inputText: string): string {
  let returnText = inputText;
  if (returnText) {
    Object.keys(xssFilter).forEach((key) => {
      returnText = returnText.replaceAll(key, xssFilter[key]);
    });
  }
  return returnText;
}
/**
 * xss 로 변경된 문자 원본 분자로 변경.
 * @param inputText text
 * @returns text
 */
export function unXss(inputText: string): string {
  let returnText = inputText;

  if (returnText) {
    Object.keys(xssFilter).forEach((key) => {
      returnText = returnText.replaceAll(xssFilter[key], key);
    });
  }
  return returnText;
}

/**
 * 첫글자 대문자 처리
 *
 * @param {string} str
 * @returns {string} test -> Test
 */
export function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * 글자 대문자 처리
 *
 * @param {string} str
 * @returns {string} test -> TEST
 */
export function upperCase(str: string): string {
  return (str || "").toUpperCase();
}

/**
 * 글자 소문자 처리
 *
 * @param {string} str
 * @returns {string} Test -> test
 */
export function lowerCase(str: string): string {
  return (str || "").toLowerCase();
}

function pad(str: any, l: number, ch: string, type = "l"): string {
  let reval = isString(str) ? str : `${str}`;

  if (isEmpty(reval) || isBlank(reval)) {
    reval = "";
  }

  const len = l - reval.length;

  if (len < 1) return reval;

  let s = "";
  let i = 0;
  while (i < len) {
    s += ch;
    i += 1;
  }
  return type === "l" ? s + reval : reval + s;
}
