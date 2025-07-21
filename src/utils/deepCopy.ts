import { deepMerge } from "./deepMerge";
import { isArray } from "./isArray";
import { isPlainObject } from "./isPlainObject";

/**
 * deep copy
 * @param copyValue copy object
 * @returns any
 */
export const deepCopy = (copyValue: any): any => {
  if (isArray(copyValue)) {
    let reval = [];
    for (let value of copyValue) {
      if (isPlainObject(value)) {
        reval.push(deepMerge({}, value));
      } else {
        reval.push(value);
      }
    }
    return reval;
  } else {
    return deepMerge({}, copyValue);
  }
};
