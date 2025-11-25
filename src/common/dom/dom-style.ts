import { $querySelectorList } from "./dom-utils";

/**
 * style class split
 * @example
 * ```
 * 'a b c' => ['a','b','c']
 * ```
 * @param {string} styleClass
 * @returns {*}
 */
export const styleClassSplit = (styleClass: string) => {
  return styleClass.trim().split(/\s+/);
};


/**
 * add element css class
 *
 * @param {string} styleClasss css class
 */
export function addClass(element: Element | NodeListOf<Element> | null | Element[], styleClass: string): void {
  if (!element) return;

  const elements = $querySelectorList(element);

  const addStyles = styleClassSplit(styleClass);

  elements.forEach((el) => {
    (el as Element).classList.add(...addStyles); // 중복 자동 처리
  });
}

/**
 * remove element css class
 *
 * @param {(HTMLElement | NodeListOf<Element>)} element html dom elements
 * @param {string} styleClass style css class
 */
export function removeClass(element: Element | NodeListOf<Element> | null | Element[], classNames: string): void {
  if (!element || typeof classNames !== "string") return;

  const elements = $querySelectorList(element);

  const styleClasses = styleClassSplit(classNames);

  for (const el of elements) {
    (el as Element).classList.remove(...styleClasses);
  }
}

/**
 * toggleClass
 *
 * 지정된 DOM 요소(또는 요소 리스트)에 하나 이상의 클래스를 토글(add/remove)합니다.
 *
 * @param element - 단일 Element 또는 NodeListOf<Element> 또는 null
 * @param classNames - 공백으로 구분된 하나 이상의 클래스 이름
 */
export function toggleClass(element: Element | NodeListOf<Element> | null | Element[], classNames: string): void {
  if (!element || typeof classNames !== "string") return;

  const elements = $querySelectorList(element);
  const styleClasses = styleClassSplit(classNames);

  for (const el of elements) {
    styleClasses.forEach((cls) => {
      (el as Element).classList.toggle(cls);
    });
  }
}

/**
 * 주어진 HTMLElement에 여러 CSS 속성을 한 번에 적용하는 함수
 *
 * @param element - 스타일을 적용할 HTML 요소
 * @param styles - 적용할 스타일 객체 (예: { color: 'red', 'font-size': '16px' })
 */
export function addStyleCss(element: HTMLElement, styles: any) {
  for (const key in styles) {
    if (Object.prototype.hasOwnProperty.call(styles, key)) {
      element.style.setProperty(key, styles[key]);
    }
  }
}
