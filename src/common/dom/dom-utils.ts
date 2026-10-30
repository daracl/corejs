import { isArray } from "../../utils/isArray";
import { isBlank } from "../../utils/isBlank";
import { isString } from "../../utils/isString";


type ElementType = Element | string | NodeList | Document | Element[]| null | undefined;

/** DOM 노드(다른 문서·iframe 의 노드 포함)인지 검사합니다. */
function isNode(value: unknown): value is Node {
  return value !== null && typeof value === "object" && typeof (value as Node).nodeType === "number";
}

/**
 * DOM 셀럭터 리스트 반환. 배열은 노드가 아닌 항목(null, undefined 등)을 제외한 새 배열을 반환합니다.
 *
 * @export
 * @param {(Element | string | NodeList | Document | Element[])} el 
 * @returns {Node[]} 
 */
export function $querySelectorList(el: ElementType): Node[] {

  if(isBlank(el)){
    return [];
  }

  if (isString(el)) {
    return Array.from(document.querySelectorAll(el))
  }

  if (isArray(el)) {
    return (el as unknown[]).filter(isNode);
  }

  if (el instanceof Document) {
    return [el];
  }

  if (el instanceof Element) {
    return [el];
  }
  
  if (el instanceof NodeList) {
    return Array.from(el)
  }
  
  return [];
}

/**
 * 첫 번째 Element 또는 Document 를 반환합니다. 대상이 없으면(빈 배열·빈 NodeList 포함) null 입니다.
 */
export function $querySelector(el: ElementType): Document|Element|null {

  if(isBlank(el)){
    return null;
  }

  if (el instanceof Document) {
    return el;
  }

  if (el instanceof Element) {
    return el;
  }

  if (isString(el)) {
    return document.querySelector(el)
  }

  if (isArray(el) || el instanceof NodeList) {
    // Element 가 아닌 노드(텍스트 등)와 null 은 건너뛰고 첫 Element/Document 를 반환한다
    return ($querySelectorList(el).find(node => node.nodeType === 1 || node.nodeType === 9) as Element | Document | undefined) ?? null;
  }

  return null;
  
}


/**
 * 주어진 요소의 위치 및 크기를 반환합니다.
 *
 * @param el - 위치를 구할 HTML 요소
 * @param includeScroll - true이면 문서 전체 기준 좌표 (스크롤 보정 포함), false이면 뷰포트 기준 좌표
 * @returns 요소의 top, left, right, bottom, width, height 정보를 포함한 객체
 */
export function getElementRect(
  el: Element,
  includeScroll: boolean = false
): {
  top: number;
  left: number;
  bottom: number;
  right: number;
  width: number;
  height: number;
} {
  if (!el) {
    throw new Error("유효하지 않은 요소입니다.");
  }

  const rect = el.getBoundingClientRect();
  const scrollX = includeScroll ? window.scrollX : 0;
  const scrollY = includeScroll ? window.scrollY : 0;

  return {
    top: rect.top + scrollY,
    left: rect.left + scrollX,
    bottom: rect.bottom + scrollY,
    right: rect.right + scrollX,
    width: rect.width,
    height: rect.height,
  };
}


/**
 *
 * @export
 * @param {ElementType} el 
 * @param {(Element | string)} renderElements 
 */
export function before(el: ElementType, renderElements: Element | string) {
  insertAdjacentHTML($querySelectorList(el), "beforebegin", renderElements);
}

export function after(el: ElementType, renderElements: Element | string) {
  insertAdjacentHTML($querySelectorList(el), "afterend", renderElements);
}

export function prepend(el: ElementType, renderElements: Element | string) {
  insertAdjacentHTML($querySelectorList(el), "afterbegin", renderElements);
}

export function append(el: ElementType, renderElements: Element | string) {
  insertAdjacentHTML($querySelectorList(el), "beforeend", renderElements);
}

/**
 * 삽입할 수 없는 대상(Element 가 아닌 노드, 부모가 없거나 문서 노드가 부모인 요소의 앞·뒤)은 건너뜁니다.
 * 문자열과 Element 를 넘길 때 같은 대상 집합에 삽입하며, 브라우저가 예외를 던지는 경우에도 조용히 건너뜁니다.
 */
function canInsert(el: Node, insertPosition: InsertPosition): boolean {
  if (el.nodeType !== 1) return false;
  if (insertPosition === "beforebegin" || insertPosition === "afterend") {
    return !!el.parentNode && el.parentNode.nodeType !== 9;
  }
  return true;
}

function insertAdjacentHTML(elements: Node[], insertPosition: InsertPosition, renderElements: Element | string) {
  const targets = elements.filter(el => canInsert(el, insertPosition));
  if (isString(renderElements)) {
    targets.forEach((el) => {
      (el as Element).insertAdjacentHTML(insertPosition, renderElements);
    });
  } else {
    // 같은 노드를 여러 대상에 삽입하면 마지막 대상으로 이동하므로 두 번째부터는 복제합니다.
    targets.forEach((el, index) => {
      (el as Element).insertAdjacentElement(insertPosition, index === 0 ? renderElements : (renderElements.cloneNode(true) as Element));
    });
  }
}

/**
 * 상위 요소 탐색 유틸
 *
 * @param el - 탐색 시작 요소
 * @param check - CSS 선택자 문자열 또는 상위 Element 객체
 * @returns 조건에 맞는 상위 요소(Element) 또는 null
 */
export function findClosest(el: Element, check: string | Element): Element | null {
  if (!el) return null;

  // check가 문자열이면 CSS 선택자 기준 탐색
  if (typeof check === "string") {
    return el.closest(check);
  }

  // check가 Element 객체이면 상위 탐색
  let current: Element | null = el;
  while (current) {
    if (current === check) return current;
    current = current.parentElement;
  }

  return null;
}
