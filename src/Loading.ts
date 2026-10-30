import { LoadingOptions } from "./types/LoadingOptions";
import { isBlank, objectDeepMerge, sanitizeHtml } from "./utils";

const THEMES = ["auto", "light", "dark"];

/** 로딩 이미지로 쓸 수 있는 URL 인지 검사합니다. 스크립트 스킴을 막고 http(s)·blob·data:image·상대 경로만 허용합니다. */
function isSafeImageUrl(url: string): boolean {
  const value = url.trim().replace(/[\u0000-\u001F\u007F\s]+/g, "");
  if (!value) return false;
  const scheme = /^([a-z][a-z0-9+.-]*):/i.exec(value);
  if (!scheme) return true;
  const name = scheme[1].toLowerCase();
  return name === "http" || name === "https" || name === "blob" || (name === "data" && /^data:image\//i.test(value));
}


/** 요소에 인라인 스타일을 DOM API 로 설정합니다. 값이 문자열로만 들어가 속성 주입이 되지 않습니다. */
function setStyles(element: HTMLElement, styles: Record<string, string>): void {
  for (const name of Object.keys(styles)) element.style.setProperty(name, styles[name]);
}

type LoadingMode = "light" | "dark";

interface LoadingColors {
  surface: string;
  text: string;
  muted: string;
  border: string;
  accent: string;
  hover: string;
  shadow: string;
}

// 값은 @daracl/ui-style 의 --dui-* 토큰과 같은 색이다
const PALETTE: Record<LoadingMode, Record<keyof LoadingColors, [string, string]>> = {
  light: {
    surface: ["--dui-body-bg", "#ffffff"],
    text: ["--dui-font-color", "#222222"],
    muted: ["--dui-muted-color", "#626976"],
    border: ["--dui-border-color", "#d9dde3"],
    accent: ["--dui-primary-color", "#2563eb"],
    hover: ["--dui-button-hover-bg", "#e3e3e3"],
    shadow: ["--dui-shadow", "0 2px 8px rgba(0, 0, 0, 0.15)"],
  },
  dark: {
    surface: ["--dui-body-bg", "#1d1e1f"],
    text: ["--dui-font-color", "#cfd3dc"],
    muted: ["--dui-muted-color", "#8d9095"],
    border: ["--dui-border-color", "#4c4d4f"],
    accent: ["--dui-primary-color", "#2563eb"],
    hover: ["--dui-button-hover-bg", "#303030"],
    shadow: ["--dui-shadow", "0 2px 12px rgba(0, 0, 0, 0.72)"],
  },
};

/** 표시할 모드를 정합니다. 명시 테마가 우선이고, auto 는 상위 data-daracl-theme 속성, 없으면 OS 설정을 따릅니다. */
function resolveMode(container: HTMLElement, theme: string): LoadingMode {
  if (theme === "light" || theme === "dark") return theme;
  const attr = container.closest("[data-daracl-theme]")?.getAttribute("data-daracl-theme");
  if (attr === "light" || attr === "dark") return attr;
  return typeof window.matchMedia === "function" && window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

/**
 * 색 값을 만듭니다. auto 는 var(--dui-*, 대체값) 으로 두어 ui-style 의 테마 변수를 따르고(토큰이 없으면 대체값),
 * 명시 테마(light|dark)는 해당 모드의 고정 값을 사용합니다.
 */
function resolveColors(mode: LoadingMode, theme: string): LoadingColors {
  const colors = {} as LoadingColors;
  for (const key of Object.keys(PALETTE[mode]) as (keyof LoadingColors)[]) {
    const [token, fallback] = PALETTE[mode][key];
    colors[key] = theme === "light" || theme === "dark" ? fallback : "var(" + token + ", " + fallback + ")";
  }
  return colors;
}

const SVG_NS = "http://www.w3.org/2000/svg";

/**
 * 돌아가는 SVG 스피너를 만듭니다. 애니메이션은 SMIL 이라 CSS 없이 동작하고, 색은 인라인 var() 로 지정합니다.
 * prefers-reduced-motion 이면 회전하지 않습니다.
 */
function createSpinner(colors: LoadingColors): SVGSVGElement {
  const svg = document.createElementNS(SVG_NS, "svg");
  svg.setAttribute("class", "daracl-cl-image daracl-cl-spinner");
  svg.setAttribute("viewBox", "0 0 32 32");
  svg.setAttribute("width", "32");
  svg.setAttribute("height", "32");
  svg.setAttribute("role", "img");
  svg.setAttribute("aria-label", "로딩 중");
  svg.style.setProperty("display", "block");
  svg.style.setProperty("flex-shrink", "0");

  const track = document.createElementNS(SVG_NS, "circle");
  const arc = document.createElementNS(SVG_NS, "circle");
  for (const circle of [track, arc]) {
    circle.setAttribute("cx", "16");
    circle.setAttribute("cy", "16");
    circle.setAttribute("r", "13.5");
    circle.setAttribute("fill", "none");
    circle.setAttribute("stroke-width", "3");
  }
  track.style.setProperty("stroke", colors.border);
  arc.style.setProperty("stroke", colors.accent);
  arc.setAttribute("stroke-linecap", "round");
  arc.setAttribute("stroke-dasharray", "21 64");
  if (!(typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches)) {
    const spin = document.createElementNS(SVG_NS, "animateTransform");
    spin.setAttribute("attributeName", "transform");
    spin.setAttribute("type", "rotate");
    spin.setAttribute("from", "0 16 16");
    spin.setAttribute("to", "360 16 16");
    spin.setAttribute("dur", "0.8s");
    spin.setAttribute("repeatCount", "indefinite");
    arc.appendChild(spin);
  }
  svg.append(track, arc);
  return svg;
}

const instanceMap: Record<string, Loading> = {};

interface LoadingGroup {
  renderer: Loading;
  members: Set<Loading>;
}

// 선택자 문자열이 달라도 같은 DOM 컨테이너라면 하나의 화면을 공유합니다.
const loadingGroups = new WeakMap<HTMLElement, LoadingGroup>();


let G_LOADING_IDX =0;

// 기본 배경색은 테마 색(surface)을 따른다. 사용자가 지정한 값이면 그대로 쓴다.
const DEFAULT_BG_COLOR = "var(--daracl-loading-backdrop, #ffffff)";

let defaultOptions:Required<LoadingOptions> = {
  //  사라지는 시간
  timeout: -1,

  // 시간 표시 여부
  enableTime: false,
  enableRequestCount: false,
  requestCount: 0,
  // 표시 내용
  content: "",
  // background color
  bgColor: DEFAULT_BG_COLOR,
  theme: "auto",
  // z-index
  zIndex: 9999,
  // opacity
  opacity: "0.3",
  // 이미지 경로 및 base64 코드
  loadingImg: "",
  // css cursor
  cursor: "wait",

  // 취소 버튼 활성화 여부
  enableCancelButton: false,
  // 취소 벼튼 활성화시  callback 메소드
  callback: (param) => {
    return true;
  },
};

/**
 * Loading 모듈
 */

export class Loading {

  private selector: string;
  private containerNode: HTMLElement | null;
  private loadingElement: HTMLElement | null;
  private options: Required<LoadingOptions>;
  private orginStylePosition = "";
  private intervalId?: number;
  private timeoutId?: number;
  private group?: LoadingGroup;
  private startedAt = 0;
  private colors?: LoadingColors;

  constructor(selector: string | HTMLElement | null | undefined, options : LoadingOptions = {}) {

    if(isBlank(selector)){
      selector = "body";
    }

    if (selector instanceof HTMLElement) {
      this.containerNode = selector;
      this.selector = "";
    } else {
      selector = selector || "body";
      // 잘못된 선택자는 예외 대신 컨테이너를 찾지 못한 경우와 같이 처리한다
      try {
        this.containerNode = document.querySelector(selector);
      } catch {
        this.containerNode = null;
      }
      this.selector = selector;
    }

    if (!this.containerNode) return;

    this.options = objectDeepMerge(defaultOptions, options);
    if (this.selector) instanceMap[this.selector] = this;

    this.show();
  }

  public static create(selector: string | HTMLElement | null | undefined, options?: LoadingOptions) {
    return new Loading(selector, options);
  }

  public static instance(selector: string) {
    return instanceMap[selector];
  }

  public static setOptions(options: LoadingOptions) {
    defaultOptions = Object.assign({}, defaultOptions, options);
  }

  private cancelHandler() {
    // 공유 화면의 취소 버튼은 해당 화면에 연결된 요청들을 취소합니다.
    let failed = false;
    let failure: unknown;
    for (const member of Array.from(this.group?.members ?? [this])) {
      try {
        if (member.options.callback?.(member.options) !== false) member.hide();
      } catch (error) {
        member.hide();
        if (!failed) { failed = true; failure = error; }
      }
    }
    if (failed) throw failure;
  }

  private startTimeout(): void {
    this.startedAt = Date.now();
    if (this.options.timeout > 0) this.timeoutId = window.setTimeout(() => this.hide(), this.options.timeout);
  }

  private updateSharedOptions(): void {
    const group = this.group;
    const renderer = group?.renderer;
    const element = renderer?.loadingElement;
    if (!group || !renderer || !element) return;
    const members = Array.from(group.members);
    const image = element.querySelector(".daracl-cl-image");
    const enableTime = members.some(member => member.options.enableTime);
    let time = element.querySelector<HTMLElement>(".daracl-cl-time");
    if (enableTime && !time) {
      time = document.createElement("div");
      time.className = "daracl-cl-time";
      time.setAttribute("aria-label", "경과 시간(초)");
      setStyles(time, { color: renderer.colors?.muted ?? "inherit", "font-size": "12px", "font-variant-numeric": "tabular-nums" });
      image?.insertAdjacentElement("beforebegin", time);
    }
    if (enableTime && time) {
      const counter = time;
      const update = () => {
        const start = Math.min(...members.filter(member => member.options.enableTime).map(member => member.startedAt));
        counter.textContent = String(Math.floor((Date.now() - start) / 1000));
      };
      window.clearInterval(renderer.intervalId);
      update();
      renderer.intervalId = window.setInterval(update, 1000);
    } else {
      time?.remove();
      window.clearInterval(renderer.intervalId);
      renderer.intervalId = undefined;
    }
    const button = element.querySelector(".daracl-cl-btn");
    if (members.some(member => member.options.enableCancelButton)) {
      if (!button) {
        const wrapper = document.createElement("div");
        wrapper.className = "daracl-cl-actions";
        wrapper.style.setProperty("width", "100%");
        const cancel = document.createElement("button");
        cancel.type = "button";
        cancel.className = "daracl-cl-btn";
        cancel.textContent = "Cancel";
        const colors = renderer.colors;
        if (colors) {
          setStyles(cancel, { "min-height": "36px", padding: "6px 18px", border: "1px solid " + colors.border, "border-radius": "8px", background: colors.surface, color: colors.text, font: "inherit", cursor: "pointer" });
          cancel.addEventListener("mouseenter", () => cancel.style.setProperty("background", colors.hover));
          cancel.addEventListener("mouseleave", () => cancel.style.setProperty("background", colors.surface));
        }
        cancel.addEventListener("click", () => renderer.cancelHandler());
        wrapper.appendChild(cancel);
        image?.parentElement?.appendChild(wrapper);
      }
    } else button?.parentElement?.remove();
    // 콘텐츠는 현재 참여자 중 마지막으로 지정한 값을 표시합니다. 외형은 최초 생성자 설정을 유지합니다.
    const content = members.filter(member => member.options.content).pop()?.options.content ?? "";
    if (content) renderer.renderContent(content);
    else element.querySelector(".daracl-cl-content")?.remove();
  }

  /**
   * 이 인스턴스의 요청 수를 갱신하고 공유 화면에 합계를 표시합니다.
   * @param count 진행 중인 요청 수
   * @returns 없음
   */
  public setRequestCount(count: number): void {
    if (!this.options) return; // 컨테이너를 찾지 못한 인스턴스
    this.options.requestCount = Number.isFinite(count) ? Math.max(0, Math.floor(count)) : 0;
    this.updateRequestCount();
  }

  private updateRequestCount(): void {
    const group = this.group;
    const element = group?.renderer.loadingElement;
    if (!group || !element) return;
    let count = 0;
    let enabled = false;
    for (const member of group.members) {
      enabled = enabled || member.options.enableRequestCount;
      count += Number.isFinite(member.options.requestCount) ? Math.max(0, Math.floor(member.options.requestCount)) : 0;
    }
    let counter = element.querySelector<HTMLElement>(".daracl-cl-request-count");
    if (!enabled) { counter?.remove(); return; }
    if (!counter) {
      counter = document.createElement("div");
      counter.className = "daracl-cl-request-count";
      counter.setAttribute("role", "status");
      setStyles(counter, { color: group.renderer.colors?.muted ?? "inherit", "font-size": "12px", "font-variant-numeric": "tabular-nums" });
      element.querySelector(".daracl-cl-image")?.insertAdjacentElement("afterend", counter);
    }
    counter.textContent = `진행 중 요청: ${count}`;
  }

  
  /**
   * show loading module
   * @public
   */ 
  public show (){
    const containerNode = this.containerNode;
    if (!containerNode) return;

    const existingGroup = loadingGroups.get(containerNode);
    if (existingGroup) {
      if (existingGroup.members.has(this)) return;
      this.group = existingGroup;
      existingGroup.members.add(this);
      if (this.selector) instanceMap[this.selector] = this;
      this.startTimeout();
      this.updateRequestCount();
      this.updateSharedOptions();
      return;
    }

    if (containerNode.querySelector(":scope >.daracl-cl")) return;

    this.orginStylePosition = containerNode.style.position;
    const computedStyle = getComputedStyle(containerNode);

    if (!["absolute", "relative", "fixed", "sticky"].includes(computedStyle.position)) {
      containerNode.style.position = "relative";
    }

    const opts = this.options;
    const theme = THEMES.includes(opts.theme) ? opts.theme : "auto";
    const colors = resolveColors(resolveMode(containerNode, theme), theme);
    this.colors = colors;

    let zIndex = opts.zIndex;
    if(defaultOptions.zIndex == opts.zIndex){
      zIndex += ++G_LOADING_IDX;
    }

    // 옵션 값은 HTML 문자열에 끼워 넣지 않고 DOM API 로 설정해 속성 주입을 막는다
    const root = document.createElement("div");
    root.className = "daracl-cl";
    root.setAttribute("data-loading-theme", theme);
    root.setAttribute("aria-label", "로딩 중");
    // 레이아웃은 스타일시트 없이도 표시되도록 인라인으로 지정한다(CSS 는 외형만 꾸민다)
    setStyles(root, { cursor: String(opts.cursor), top: "0px", left: "0px", "z-index": String(zIndex), position: "absolute", width: "100%", height: "100%", display: "flex", "align-items": "center", "justify-content": "center", overflow: "hidden", "box-sizing": "border-box", color: colors.text, font: "400 14px/1.5 system-ui, sans-serif" });

    const backdrop = document.createElement("div");
    backdrop.className = "daracl-cl-backdrop";
    setStyles(backdrop, { position: "absolute", background: opts.bgColor === DEFAULT_BG_COLOR ? colors.surface : String(opts.bgColor), opacity: String(opts.opacity), width: "100%", height: "100%", "z-index": "1" });

    const panel = document.createElement("div");
    panel.className = "daracl-cl-panel";
    // 패널은 오버레이 안에서 flex 로 가운데 배치하고 오버레이보다 커지지 않게 제한한다
    setStyles(panel, { "z-index": "10", "text-align": "center", margin: "0", position: "relative", "box-sizing": "border-box", "max-width": "calc(100% - 24px)", "max-height": "calc(100% - 24px)", overflow: "auto", display: "flex", "flex-direction": "column", "align-items": "center", gap: "12px", padding: "24px 28px", border: "1px solid " + colors.border, "border-radius": "16px", background: colors.surface, "box-shadow": colors.shadow });
    if (opts.loadingImg && isSafeImageUrl(opts.loadingImg)) {
      const image = document.createElement("img");
      image.className = "daracl-cl-image";
      image.setAttribute("src", opts.loadingImg);
      image.setAttribute("alt", "로딩 중");
      panel.appendChild(image);
    } else {
      panel.appendChild(createSpinner(colors));
    }
    root.append(backdrop, panel);

    containerNode.insertAdjacentElement("afterbegin", root);

    this.loadingElement = root;
    this.group = { renderer: this, members: new Set([this]) };
    loadingGroups.set(containerNode, this.group);
    if (this.selector) instanceMap[this.selector] = this;
    this.startTimeout();
    this.updateRequestCount();

    this.updateSharedOptions();
  };

  
  /**
   * set display content
   *
   * @public
   * @param {string} content 
   */
  public setContent (content: string){
    if (!this.containerNode) return;
    this.options.content = content;
    this.renderContent(content);
  };

  private renderContent(content: string): void {
    const loadingElement = this.group?.renderer.loadingElement ?? this.loadingElement;
    if (!loadingElement) return;
    let existing = loadingElement.querySelector(".daracl-cl-content");
    if (!existing) {
      const created = document.createElement("div");
      created.className = "daracl-cl-content";
      created.style.setProperty("overflow-wrap", "anywhere");
      existing = created;
      const image = loadingElement.querySelector(".daracl-cl-image");
      if (!image) return;
      image.insertAdjacentElement("afterend", existing);
    }
    // HTML 내용은 허용한 태그·속성만 남겨 스크립트 실행을 막는다
    existing.replaceChildren(sanitizeHtml(content));
  };

  
  /**
   * hide loading module
   *
   * @public
   * @param {?boolean} [flag] 
   */
  public hide (flag?: boolean){
    const group = this.group;
    if (!group || !group.members.delete(this)) return;
    window.clearTimeout(this.timeoutId);
    this.timeoutId = undefined;
    if (flag !== false && instanceMap[this.selector] === this) {
      delete instanceMap[this.selector];
      const replacement = Array.from(group?.members ?? []).find(member => member.selector === this.selector);
      if (replacement) instanceMap[this.selector] = replacement;
    }
    if (group?.members.size) {
      this.updateRequestCount();
      this.updateSharedOptions();
      if (this !== group.renderer) this.group = undefined;
      return;
    }
    const renderer = group?.renderer ?? this;
    window.clearInterval(renderer.intervalId);
    window.clearTimeout(renderer.timeoutId);
    renderer.intervalId = undefined;
    renderer.timeoutId = undefined;
    if (renderer.containerNode && renderer.loadingElement) {
      renderer.containerNode.style.position = renderer.orginStylePosition || "";
      renderer.loadingElement.remove();
      renderer.loadingElement = null;
    }
    if (renderer.containerNode) loadingGroups.delete(renderer.containerNode);
    this.group = undefined;
    renderer.group = undefined;
  };

  
  /**
   * destroy loading instance
   *
   * @public
   * @static
   * @param {string} selector 
   */
  public static destroy(selector: string) {
    if (instanceMap[selector]) {
      const instance = instanceMap[selector];
      for (const member of Array.from(instance.group?.members ?? [instance])) member.hide();
      delete instanceMap[selector];
    }
  }
}
