import { isObject } from "./isObject";

/**
 * object to request query string 값 체크.
 *
 * @param {*} param
 * @returns {String} query string
 */
export function objectToQueryString(param: any): string {
  return Object.keys(param)
    .map((key) => {
      const val = param[key];
      // undefined 와 같이 null 도 보내지 않는다
      if (val !== undefined && val !== null) {
        return `${encodeURIComponent(key)}=${encodeURIComponent(val instanceof Date && !isNaN(val.getTime()) ? val.toISOString() : isObject(val) ? JSON.stringify(val) : String(val))}`;
      }
    })
    .filter(Boolean)
    .join("&");
}
