import { isArray } from "./isArray";
import { isDate } from "./isDate";
import { isEmpty } from "./isEmpty";
import { isFunction } from "./isFunction";
import { isObject } from "./isObject";
import { isPlainObject } from "./isPlainObject";
import { isUndefined } from "./isUndefined";

/**
 * deep merge
 * 
 * @example
 ```
 merge({},{aaa:'bbb',ccc:'ddd'},{bbb:'bbb','aaa':'aaa'})) -> {"aaa": "aaa", "bbb": "bbb", "ccc": "ddd"}
 ```
 * @param {...any[]} value
 * @returns {object}
 */
export function deepMerge(...value: any[]): any {
  let reval = value[0];

  if (!isObject(reval) || isEmpty(reval)) {
    return reval;
  }

  let i = 1;
  if (Object.keys(reval).length > 0) {
    i = 0;
    reval = isArray(reval) ? [] : {};
  }
  const argLen = value.length;
  for (; i < argLen; i += 1) {
    cloneDeep(reval, value[i]);
  }

  return reval;
}

function cloneDeep(dst: any, src: any): any {
  if (isArray(src)) {
    return cloneArrayDeep(dst, src);
  }

  if (isDate(src)) {
    return new src.constructor(src);
  }

  if (isObject(src)) {
    return cloneObjectDeep(dst, src);
  }

  return src;
}

/*eslint no-param-reassign: "error"*/
function cloneObjectDeep(dst: any, src: any): object {
  if (isFunction(src)) {
    return src;
  }

  for (const key of Object.keys(src)) {
    const val = (src as any)[key];

    if (isUndefined(val)) {
      continue;
    }

    if (val === null) {
      dst[key] = val;
    } else if (isFunction(val)) {
      dst[key] = val;
    } else if (isEmpty(dst[key])) {
      dst[key] = cloneDeep(isArray(val) ? [] : {}, val);
    } else if (!isObject(val)) {
      dst[key] = val;
    } else {
      cloneDeep(dst[key], val);
    }
  }
  return dst;
}

function cloneArrayDeep(dst: any, src: any[]) {
  const isObj = isPlainObject(dst);
  const isArr = isArray(dst);

  for (let i = 0; i < src.length; i += 1) {
    const val = src[i];
    let newVal;

    if (val == null) {
      newVal = val;
    } else {
      newVal = cloneDeep(isArray(val) ? [] : {}, val);
    }

    if (isObj) {
      (dst as any)[i] = newVal;
    } else {
      if (isArr && dst.indexOf(newVal) < 0) {
        dst.push(newVal);
      }
    }
  }
  return dst;
}
