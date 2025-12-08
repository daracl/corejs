import { isArray, isBlank, isString } from "@/utils";


type ElementType = Element | string | NodeList | Document | Element[]| null | undefined;

/**
 * DOM 셀럭터 리스트 반환
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
    return el as Element[];
  }

  if (el instanceof Document) {
    return [document];
  }

  if (el instanceof Element) {
    return [el];
  }
  
  if (el instanceof NodeList) {
    return Array.from(el)
  }
  
  return [];
}

export function $querySelector(el: ElementType): Document|Element|null {

  if(isBlank(el)){
    return null;
  }

  if (el instanceof Document) {
    return document;
  }

  if (el instanceof Element) {
    return el;
  }

  if (isString(el)) {
    return document.querySelector(el)
  }

  if (isArray(el)) {
    return el[0];
  }

  
  if (el instanceof NodeList) {
    return el.item(0) as Element;
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

function insertAdjacentHTML(elements: Node[], insertPosition: InsertPosition, renderElements: Element | string) {
  if (isString(renderElements)) {
    elements.forEach((el) => {
      (el as Element).insertAdjacentHTML(insertPosition, renderElements);
    });
  } else {
    elements.forEach((el) => {
      (el as Element).insertAdjacentElement(insertPosition, renderElements);
    });
  }
}
