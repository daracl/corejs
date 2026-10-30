import { uuid } from "./uuid";

export type PopupAlignment = "top" | "center" | "left" | "right" | "bottom";

export interface PopupPosition {
  align?: PopupAlignment;
  topMargin?: number;
  leftMargin?: number;
  /** 중앙 위치 계산에 사용할 세로 분모입니다. 기본값은 2입니다. */
  top?: number;
  /** 중앙 위치 계산에 사용할 가로 분모입니다. 기본값은 2입니다. */
  left?: number;
  /** IE에서 현재 브라우저 창을 기준으로 중앙에 배치합니다. */
  ieDualCenter?: boolean;
}

export interface PopupOptions {
  param?: Record<string, unknown>;
  method?: "GET" | "POST" | "get" | "post";
  name?: string;
  /** window.open 기능 문자열입니다. 명시한 top/left는 자동 위치보다 우선합니다. */
  viewOption?: string;
  position?: PopupAlignment | PopupPosition;
  /**
   * true 면 열린 창의 opener 를 끊어 `window.opener` 로 되접근하지 못하게 합니다.
   * 지정하지 않으면 현재 출처와 다른 URL 을 열 때만 끊고, 같은 출처는 기존처럼 opener 를 유지합니다. false 면 항상 유지합니다.
   */
  noopener?: boolean;
}

/** 현재 창을 이동시키는 예약 창 이름입니다. 팝업 이름으로 쓸 수 없습니다. */
const NAVIGATING_NAMES = new Set(["_self", "_parent", "_top"]);

function serializeValue(value: unknown): string {
  return typeof value === "object" ? JSON.stringify(value) : String(value);
}

/** 사용 가능한 화면 영역을 기준으로 팝업 좌표를 계산합니다. IE의 다중 화면 중앙 배치를 지원합니다. */
export function popupPosition(width: number, height: number, tr = 2, lr = 2, ieDualCenter = false): { top: number; left: number } {
  const integer = (value: number) => parseInt(String(value), 10);
  const popupWidth = integer(width);
  const popupHeight = integer(height);
  const topRatio = integer(tr) || 2;
  const leftRatio = integer(lr) || 2;
  const screen: Screen & { availLeft?: number; availTop?: number; left?: number; top?: number } = window.screen;
  const isIE = /MSIE|Trident\//.test(window.navigator.userAgent);
  if (isIE && ieDualCenter) {
    const left = window.screenLeft ?? screen.left ?? 0;
    const top = window.screenTop ?? screen.top ?? 0;
    const viewportWidth = window.innerWidth || document.documentElement.clientWidth || screen.width;
    const viewportHeight = window.innerHeight || document.documentElement.clientHeight || screen.height;
    return { left: (viewportWidth - popupWidth) / 2 + left, top: (viewportHeight - popupHeight) / 2 + top };
  }
  const availableWidth = screen.availWidth || window.innerWidth;
  const availableHeight = screen.availHeight || window.innerHeight;
  const top = (availableHeight - popupHeight) / topRatio;
  return {
    top: isIE ? Math.max(0, top) : top + (screen.availTop ?? 0),
    left: (availableWidth - popupWidth) / leftRatio + (isIE ? 0 : screen.availLeft ?? 0),
  };
}

function popupFeatures(options: PopupOptions): string {
  const features = new Map<string, string>();
  for (const item of (options.viewOption ?? "").split(",")) {
    const [key, ...value] = item.trim().split("=");
    if (key) features.set(key.toLowerCase(), value.join("=").trim() || "yes");
  }
  const numeric = (key: string, fallback: number): number => {
    const value = features.get(key);
    if (value === undefined || !/^-?\d+(?:\.\d+)?(?:px)?$/i.test(value)) return fallback;
    return parseFloat(value);
  };
  const position = typeof options.position === "string" ? { align: options.position } : options.position ?? {};
  const screen: Screen & { availLeft?: number; availTop?: number } = window.screen;
  const originLeft = screen.availLeft !== undefined && Number.isFinite(screen.availLeft) ? screen.availLeft : 0;
  const originTop = screen.availTop !== undefined && Number.isFinite(screen.availTop) ? screen.availTop : 0;
  const availableWidth = screen.availWidth || window.innerWidth;
  const availableHeight = screen.availHeight || window.innerHeight;
  const width = Math.max(1, numeric("width", 1050));
  const height = Math.max(1, numeric("height", availableHeight - 80));
  const align = position.align ?? (features.has("height") ? "center" : "top");
  let { left, top } = popupPosition(width, height, position.top, position.left, position.ieDualCenter);
  if (align === "top") top = originTop;
  if (align === "bottom") top = originTop + availableHeight - height;
  if (align === "left") left = originLeft;
  if (align === "right") left = originLeft + availableWidth - width;
  features.set("width", String(Math.round(width)));
  features.set("height", String(Math.round(height)));
  features.set("top", String(Math.round(numeric("top", top + (position.topMargin ?? (align === "top" ? 10 : 0))))));
  features.set("left", String(Math.round(numeric("left", left + (position.leftMargin ?? 0)))));
  if (!features.has("scrollbars")) features.set("scrollbars", "yes");
  if (!features.has("resizable")) features.set("resizable", "yes");
  return Array.from(features, ([key, value]) => `${key}=${value}`).join(",");
}

/**
 * GET 또는 POST로 팝업을 열고 창 참조를 반환합니다. 팝업이 차단되면 null을 반환합니다.
 * 사용자 클릭 처리 안에서 호출해야 하며, 객체 매개변수는 JSON으로 전송합니다.
 * POST 전송 실패는 호출자에게 전달하고 임시 폼은 항상 제거합니다.
 */
export function popup(url: string, options: PopupOptions = {}): Window | null {
  const method = (options.method ?? "GET").toUpperCase();
  if (method !== "GET" && method !== "POST") throw new TypeError("popup method must be GET or POST");
  const destination = new URL(url, document.baseURI);
  if (destination.protocol !== "http:" && destination.protocol !== "https:") throw new TypeError("popup URL must use HTTP or HTTPS");
  if (options.name && NAVIGATING_NAMES.has(options.name.trim().toLowerCase())) throw new TypeError("popup name must not be _self, _parent or _top");
  const entries = Object.entries(options.param ?? {})
    .filter(([, value]) => value !== undefined && value !== null)
    .map(([key, value]) => [key, serializeValue(value)] as const);
  // 예약된 창 이름을 피하고 같은 이름의 팝업은 재사용합니다.
  const name = options.name ? encodeURIComponent(options.name) : "daracl_" + uuid();

  if (method === "GET") {
    for (const [key, value] of entries) destination.searchParams.set(key, value);
  }
  const opened = window.open(method === "GET" ? destination.href : "about:blank", name, popupFeatures(options));
  if (!opened) return null;
  if (options.noopener ?? destination.origin !== window.location.origin) {
    try { opened.opener = null; } catch { /* opener 를 바꿀 수 없는 창은 그대로 둡니다. */ }
  }
  if (method === "POST") {
    const form = document.createElement("form");
    form.method = "post";
    form.action = destination.href;
    form.target = name;
    form.acceptCharset = "UTF-8";
    form.hidden = true;
    for (const [key, value] of entries) {
      const input = document.createElement("input");
      input.type = "hidden";
      input.name = key;
      input.value = value;
      form.appendChild(input);
    }
    try {
      (document.body ?? document.documentElement).appendChild(form);
      // submit이라는 매개변수가 폼 메서드를 가려도 정상 전송합니다.
      HTMLFormElement.prototype.submit.call(form);
    } finally {
      form.remove();
    }
  }
  try {
    opened.focus();
  } catch {
    /* 브라우저가 포커스 이동을 거부해도 열린 창을 반환합니다. */
  }
  return opened;
}
