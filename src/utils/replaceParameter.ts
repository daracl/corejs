import { isPlainObject } from "./isPlainObject";
import { isObject } from "./isObject";

const SPEICAL_CHAR_REGEX = {
  "|": "[|]",
  "+": "[+]",
  $: "[$]",
  "*": "[*]",
  "(": "\\(",
  ")": "\\)",
  "{": "\\{",
  "}": "\\}",
  "[": "\\[",
  "]": "\\]",
  "\\": "\\\\\\\\",
} as any;

/**
 * replace template parameter 
 * 
 * @example
 ```
 replaceParameter('aaa=#aaa#&bbb=#bbb#',{
	aaa:"aaaParameter"
	,bbb : '111'
 })
 ```
 * @param {string} template 변경할 template
 * @param {*} param	파라미터
 * @returns {string} 'aaa=aaaParameter&bbb=111
 */
export function replaceParameter(template: string, param: any): string {
  const matchObj = template.match(/#.*?#/g);

  if (matchObj == null) return template;

  let returnTemplate = template;
  const tmpKey = {} as any;

  let matchKey;
  let orginKey;

  const paramObjFlag = isPlainObject(param);

  for (let j = 0, matchLen = matchObj.length; j < matchLen; j += 1) {
    orginKey = matchObj[j];
    matchKey = orginKey;

    const keyMatch = matchKey.match(/[*+$|^(){}[\]]/gi);

    if (keyMatch != null) {
      const tmpReplaceKey = {} as any;
      for (let z = 0, matchKeyLen = keyMatch.length; z < matchKeyLen; z += 1) {
        const specCh = keyMatch[z];

        if (!tmpReplaceKey[specCh]) {
          matchKey = matchKey.replace(new RegExp(SPEICAL_CHAR_REGEX[specCh], "g"), SPEICAL_CHAR_REGEX[specCh]);
          tmpReplaceKey[specCh] = specCh;
        }
      }
    }

    if (paramObjFlag) {
      if (!tmpKey[orginKey]) {
        const paramKey = orginKey.replace(/#/g, "");
        let replaceValue = (param as any)[paramKey] || "";
        if (isObject(replaceValue)) {
          replaceValue = JSON.stringify(replaceValue);
        }
        returnTemplate = returnTemplate.replace(new RegExp(matchKey, "g"), replaceValue);
        tmpKey[orginKey] = orginKey;
      }
    } else {
      returnTemplate = returnTemplate.replace(new RegExp(matchKey, "g"), param);
    }
  }
  return returnTemplate;
}
