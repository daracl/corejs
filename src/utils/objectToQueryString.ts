/**
 * object to request query string 값 체크.
 *
 * @param {*} param
 * @returns {String} query string
 */
export function objectToQueryString(param: any): string {
  return Object.keys(param)
    .map((key) => {
      if (param.hasOwnProperty(key) && param[key] !== undefined) {
        const val = param[key];
        return `${key}=${val}`;
      }
    })
    .filter(Boolean)
    .join("&");
}
