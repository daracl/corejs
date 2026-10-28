import { isArray } from "./isArray";
import { isDate } from "./isDate";
import { isEmpty } from "./isEmpty";
import { isFunction } from "./isFunction";
import { isObject } from "./isObject";
import { isPlainObject } from "./isPlainObject";
import { isUndefined } from "./isUndefined";

function cloneDeep(dst: any, src: any, excludeKeys:Set<string>): any {
  if (isArray(src)) {
    return cloneArrayDeep(dst, src, excludeKeys);
  }

  if (isDate(src)) {
     return new Date(src.getTime());
  }

  if (isObject(src)) {
    return cloneObjectDeep(dst, src, excludeKeys);
  }

  return src;
}

/*eslint no-param-reassign: "error"*/
function cloneObjectDeep(dst: any, src: any, excludeKeys:Set<string>): object {
  if (isFunction(src)) {
    return src;
  }

  for (const key of Object.keys(src)) {
    if (excludeKeys.has(key) || key === "__proto__" || key === "constructor" || key === "prototype") continue;

    const val = (src as any)[key];

    if (isUndefined(val)) {
      continue;
    }

    if (val === null) {
      dst[key] = val;
    } else if (isFunction(val)) {
      dst[key] = val;
    } else if (isEmpty(dst[key])) {
      dst[key] = cloneDeep(isArray(val) ? [] : {}, val, excludeKeys);
    } else if (!isObject(val)) {
      dst[key] = val;
    } else {
      if (!isObject(dst[key])) {
        dst[key] = {};
      }
      dst[key] = cloneDeep(dst[key], val, excludeKeys);
    }
  }
  return dst;
}

function cloneArrayDeep(dst: any, src: any[], excludeKeys:Set<string>) {
  const isObj = isPlainObject(dst);
  const isArr = isArray(dst);
  const seen = new Set(isArr ? dst : []);

  for (let i = 0; i < src.length; i += 1) {
    const val = src[i];
    let newVal;

    if (val == null) {
      newVal = val;
    } else {
      newVal = cloneDeep(isArray(val) ? [] : {}, val, excludeKeys);
    }

    if (isObj) {
      (dst as any)[i] = newVal;
    } else {
      if (isArr && (Number.isNaN(newVal) || !seen.has(newVal))) {
        seen.add(newVal);
        dst.push(newVal);
      }
    }
  }
  return dst;
}

/**
 * 깊은 병합 (objectDeepMerge)
 *
 * - 여러 객체를 순서대로 병합하여 새 객체를 반환합니다.
 * - 값이 객체이면 재귀적으로 병합하고, 배열은 내부 요소를 복사하여 병합합니다.
 * - 함수는 그대로 복사합니다.
 * - undefined 값은 무시됩니다.
 * - 마지막 인자로 {_excludeKeys: string[]} 형태의 옵션 객체를 전달하면
 *   해당 키들은 병합에서 제외됩니다 (첫 번째 소스에는 제외 적용되지 않음).
 *
 * 사용 예:
 * - 기본 병합
 *   const out = objectDeepMerge(
 *     { a: 1, c: 3 },
 *     { b: 2, a: 10 }
 *   );
 *   // out -> { a: 10, b: 2, c: 3 }
 *
 * - 키 제외 (_excludeKeys)
 *   const out2 = objectDeepMerge(
 *     { a: 1, c: 3 },
 *     { b: 2, a: 10 },
 *     { _excludeKeys: ['a'] }
 *   );
 *   // out2 -> { a: 1, b: 2, c: 3 } // 'a' 는 두번째 소스에서 덮어쓰지 않음
 *
 * - null / 함수 처리
 *   objectDeepMerge({ x: 1 }, { x: null }) -> { x: null }
 *   objectDeepMerge({ f: () => 1 }, { f: () => 2 }) -> second f replaces first
 *
 * 주의:
 * - exclude 키는 마지막 인자에 _excludeKeys 배열로 전달해야 하며,
 *   첫 번째 소스(초기값)에는 제외 규칙이 적용되지 않습니다(초기값을 보존하도록 설계).
 *
 * @param {...any[]} values - 병합할 값들. 마지막에 {_excludeKeys: string[]} 옵션을 넣을 수 있음.
 * @returns {object} 병합된 새 객체
 */
export function objectDeepMerge(...values: any[]): any {
  if (values.length < 1) {
    return values;
  }

  let excludeKeys = new Set<string>();
  let sources = values; 
  const last = values[values.length - 1];
  if (last && isObject(last) && isArray((last as any)._excludeKeys)) {
    excludeKeys = new Set<string>(last._excludeKeys.map(String));
    sources = values.slice(0, -1);
  }
  
  let result = {};

  let firstflag = true; 
  for (let value of sources) {
    if(isEmpty(value)){
      firstflag = false; 
      continue;
    } 

    if(firstflag){
      cloneDeep(result, value, new Set<string>());
      firstflag = false; 
    }else{
      cloneDeep(result, value, excludeKeys);
    }
  }

  return result;
}


export function arrayDeepMerge(...values: any[]): any {
  if (values.length < 1) {
    return values;
  }
  
  let source:any[] = [];
  let excludeKeys = new Set<string>();
  
  for (let value of values) {
    if(isEmpty(value)) continue;
    cloneArrayDeep(source, value, excludeKeys);
  }

  return source;
}
