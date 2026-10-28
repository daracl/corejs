import { isPlainObject } from "./isPlainObject";
import { isObject } from "./isObject";

/** Replace #key# placeholders literally, preserving false and zero values. */
export function replaceParameter(template: string, param: any): string {
  const objectParam = isPlainObject(param);
  return template.replace(/#.*?#/g, placeholder => {
    const key = placeholder.slice(1, -1);
    const value = objectParam
      ? (Object.prototype.hasOwnProperty.call(param, key) ? param[key] ?? "" : "")
      : param;
    return isObject(value) ? JSON.stringify(value) : String(value);
  });
}
