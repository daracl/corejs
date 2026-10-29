import { addClass, styleClassSplit, addStyleCss } from "../common/dom/dom-style";
import { getElementRect } from "../common/dom/dom-utils";
import { isFunction } from "./isFunction";
import { isHTMLElement } from "./typeChecks";
import { camelToKebab } from "./stringUtils";
import { clamp } from "./number";

export type ElementAttributes = Record<string, string | number | boolean | null | undefined | Record<string, unknown>>;

/** 공백으로 구분된 클래스 중 하나라도 포함하는지 검사합니다. */
export function hasClass(element: Element, className: string): boolean {
  return styleClassSplit(className).some(name => element.classList.contains(name));
}

/** 크기가 있고 visibility가 hidden이 아닌 요소인지 검사합니다. */
export function isVisible(element: HTMLElement): boolean {
  return !!(element.offsetHeight || element.offsetWidth) && getComputedStyle(element).visibility !== "hidden";
}

/** HTML 요소를 만들고 class·style·dataset·일반 속성과 textContent를 적용합니다. HTML 문자열을 실행하지 않습니다. */
export function createHTMLElement<K extends keyof HTMLElementTagNameMap>(tagName: K, className?: string, attrs?: ElementAttributes, text?: string): HTMLElementTagNameMap[K];
export function createHTMLElement(tagName: string, className?: string, attrs?: ElementAttributes, text?: string): HTMLElement;
export function createHTMLElement(tagName: string, className?: string, attrs: ElementAttributes = {}, text?: string): HTMLElement {
  const element = document.createElement(tagName);
  if (className) addClass(element, className);
  for (const [key, value] of Object.entries(attrs)) {
    if (value === null || value === undefined) continue;
    if (key === "style" && value !== null && typeof value === "object") {
      const styles: Record<string, unknown> = {};
      for (const [name, item] of Object.entries(value)) styles[camelToKebab(name)] = item;
      addStyleCss(element, styles);
    } else if (key === "dataset" && value !== null && typeof value === "object") {
      for (const [name, item] of Object.entries(value)) element.setAttribute(`data-${camelToKebab(name)}`, String(item));
    } else element.setAttribute(key, value !== null && typeof value === "object" ? JSON.stringify(value) : String(value));
  }
  if (text !== undefined) element.textContent = text;
  return element;
}

/** 신뢰할 수 있는 HTML 문자열의 첫 번째 요소를 반환합니다. sanitize 기능은 없습니다. */
export function templateToElement(html: string): Element | null {
  const template = document.createElement("template");
  template.innerHTML = html;
  return template.content.firstElementChild;
}

/** 숫자·단위 없는 양의 정수 문자열에 px를 붙입니다. 0은 빈 문자열입니다. */
export function normalizeCssLength(value: number | string): string {
  return !value ? "" : typeof value === "number" || /^\d+$/.test(value) ? `${value}px` : value;
}

/** 클래스 문자열 또는 콜백 결과를 기존 core 클래스 토큰 처리로 정규화합니다. */
export function resolveClassName<T>(value: string | ((params?: T) => string) | undefined, params?: T): string[] {
  if (!value) return [];
  return styleClassSplit(isFunction(value) ? value(params) : value);
}

/** 스크롤바 포함 여부에 따라 브라우저의 사용 가능한 크기를 반환합니다. */
export function getBrowserSize(usableSize = true): { width: number; height: number } {
  return usableSize ? { width: document.documentElement.clientWidth, height: document.documentElement.clientHeight }
    : { width: window.innerWidth, height: window.innerHeight };
}

/** 페이지의 현재 스크롤 좌표를 반환합니다. */
export function getScrollPosition(): { top: number; left: number } {
  return { top: window.pageYOffset ?? (document.documentElement.scrollTop || document.body.scrollTop || 0),
    left: window.pageXOffset ?? (document.documentElement.scrollLeft || document.body.scrollLeft || 0) };
}

/** 페이지 좌표의 레이어가 화면을 벗어나지 않도록 위치를 조정합니다. */
export function outerLayerPosition(layer: HTMLElement, position: { x: number; y: number }): { top: number; left: number } {
  const scroll = getScrollPosition(), rect = getElementRect(layer), view = getBrowserSize();
  const bottom = scroll.top + view.height, right = scroll.left + view.width;
  return { top: Math.max(0, position.y + rect.height + 5 > bottom ? bottom - rect.height - 5 : position.y),
    left: Math.max(0, position.x + rect.width > right ? position.x - rect.width : position.x) };
}

/** 컨테이너 내 팝업의 크기·위치를 대상 요소와 viewport 기준으로 계산합니다. */
export function innerLayerPosition(container: HTMLElement, target: HTMLElement, layer: HTMLElement, margin = 2): { top: number; left: number; height: number; width: number } {
  const parent = getElementRect(container), rect = getElementRect(target);
  const height = Math.min(layer.offsetHeight || getElementRect(layer).height, Math.max(rect.top - margin, window.innerHeight - rect.bottom - margin, 0));
  const top = rect.bottom + height > window.innerHeight ? rect.top - height - margin : rect.bottom;
  return { top: top - parent.top, left: rect.left - parent.left, height, width: rect.width };
}

export interface ScrollTarget { element?: HTMLElement; top: number; bottom: number; }
const isPageRoot = (element: Element): boolean => element === document.body || element === document.documentElement;

/** 요소·가까운 선택자·스크롤 가능한 상위 요소 순으로 스크롤 대상을 정합니다. */
export function resolveScrollElement(container: HTMLElement, option?: string | HTMLElement): HTMLElement | undefined {
  let found: HTMLElement | undefined;
  if (isHTMLElement(option)) found = option;
  else if (typeof option === "string" && option) {
    try { found = container.closest<HTMLElement>(option) ?? undefined; } catch { /* 자동 탐색합니다. */ }
  }
  if (found) return isPageRoot(found) ? undefined : found;
  for (let element: HTMLElement | null = container; element && !isPageRoot(element); element = element.parentElement) {
    if (["auto", "scroll", "overlay"].includes(getComputedStyle(element).overflowY) && element.scrollHeight > element.clientHeight) return element;
  }
  return undefined;
}

/** 스크롤 대상과 viewport가 겹치는 세로 영역을 반환합니다. */
export function measureScrollTarget(element?: HTMLElement): ScrollTarget {
  if (!element) return { top: 0, bottom: window.innerHeight };
  const rect = getElementRect(element);
  return { element, top: clamp(rect.top, 0, window.innerHeight), bottom: clamp(rect.bottom, 0, window.innerHeight) };
}

/** 스크롤 대상 선택과 영역 측정을 함께 수행합니다. */
export function resolveScrollTarget(container: HTMLElement, option?: string | HTMLElement): ScrollTarget {
  return measureScrollTarget(resolveScrollElement(container, option));
}

/** Escape 키인지 검사합니다. */
export function isEsc(event: KeyboardEvent): boolean { return event.key === "Escape" || event.key === "Esc"; }

/** 주 포인터의 왼쪽 버튼 또는 터치 입력인지 검사합니다. */
export function isPrimaryPointer(event: Event): boolean {
  if (typeof PointerEvent !== "undefined" && event instanceof PointerEvent) return event.isPrimary && event.button === 0;
  if (typeof MouseEvent !== "undefined" && event instanceof MouseEvent) return event.button === 0;
  return typeof TouchEvent !== "undefined" && event instanceof TouchEvent;
}

/** 두 좌표의 이동 거리가 임계값을 초과했는지 검사합니다. */
export function isMouseMoved(start: { x: number; y: number }, current: { x: number; y: number }, threshold = 5): boolean {
  return (current.x - start.x) ** 2 + (current.y - start.y) ** 2 > threshold ** 2;
}

/** URL의 실행 스킴과 공백·제어 문자로 숨긴 스킴을 검사합니다. */
export function isSafeUrl(url: string): boolean {
  const value = url.trim().replace(/[\u0000-\u001F\u007F\s]+/g, "");
  if (!value) return false;
  const match = /^([a-z][a-z0-9+.-]*):/i.exec(value);
  if (!match) return true;
  if (match[1].toLowerCase() === "data") return /^data:image\/(?:png|gif|jpe?g|webp|avif|bmp)(?:;|,)/i.test(value);
  return ["http", "https", "mailto", "tel"].includes(match[1].toLowerCase());
}

/** 접두사가 붙은 클래스 이름 생성 함수를 반환합니다. */
export function createClassNamer(prefix: string): (...names: string[]) => string {
  return (...names) => names.flatMap(styleClassSplit).map(name => `${prefix}-${name}`).join(" ");
}
