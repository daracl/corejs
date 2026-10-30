import { $querySelectorList } from "./dom-utils";

export function eqAttributeValue(element: HTMLElement, attr: string, value: string) {
  return element.getAttribute(attr) == value;
}

/**
 * add attribute
 * @param attrs element attribute object
 * @returns DaraElement
 */
export function addAttr(el: HTMLElement, attrs: any) {
  for (let key in attrs) {
    // null·undefined 는 "null"/"undefined" 문자열 속성이 되지 않도록 건너뛴다
    if (attrs[key] === null || attrs[key] === undefined) continue;
    el.setAttribute(key, attrs[key]);
  }
}

/**
 * remove html element attribute
 *
 * @param {HTMLElement} el element
 * @param {...string[]} attrKey attribute key
 */
export function removeAttr(element: Element | NodeList | Element[] | null | undefined, ...attrKey: string[]) {
  // SVG 같은 HTMLElement 가 아닌 Element, 배열, NodeList 를 모두 처리한다
  for (const ele of $querySelectorList(element)) {
    for (const attr of attrKey) {
      (ele as Element).removeAttribute(attr);
    }
  }
}
