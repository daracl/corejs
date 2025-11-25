import { isArray, isBlank, isString } from "@/utils";


/**
 * DOM 셀럭터 리스트 반환
 *
 * @export
 * @param {(Element | string | NodeList | Document | Element[])} el 
 * @returns {Node[]} 
 */
export function $querySelectorList(el: Element | string | NodeList | Document | Element[]): Node[] {

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