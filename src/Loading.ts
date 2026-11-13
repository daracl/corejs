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


// 외형은 고정 CSS로 등록하며 사용자 입력을 스타일시트 문자열에 삽입하지 않는다.
const LOADING_CSS = `
.daracl-cl {
  --cl-surface-base: #ffffff; --cl-text-base: #222222; --cl-muted-base: #626976;
  --cl-border-base: #d9dde3; --cl-hover-base: #e3e3e3; --cl-shadow-base: 0 2px 8px rgba(0,0,0,.15);
  --cl-surface: var(--dui-body-bg, var(--cl-surface-base));
  --cl-text: var(--dui-font-color, var(--cl-text-base));
  --cl-muted: var(--dui-muted-color, var(--cl-muted-base));
  --cl-border: var(--dui-border-color, var(--cl-border-base));
  --cl-hover: var(--dui-button-hover-bg, var(--cl-hover-base));
  --cl-shadow: var(--dui-shadow, var(--cl-shadow-base));
  --cl-accent: var(--dui-primary-color, #2563eb);
  position: absolute; top: 0; left: 0; width: 100%; height: 100%;
  display: flex; align-items: center; justify-content: center; overflow: hidden; box-sizing: border-box;
  cursor: var(--daracl-loading-cursor, wait); z-index: var(--daracl-loading-z-index, 9999);
  color: var(--cl-text); font: 400 14px/1.5 system-ui, sans-serif;
}
.daracl-cl[data-loading-theme="dark"], .daracl-cl[data-loading-mode="dark"] {
  --cl-surface-base: #1d1e1f; --cl-text-base: #cfd3dc; --cl-muted-base: #8d9095;
  --cl-border-base: #4c4d4f; --cl-hover-base: #303030; --cl-shadow-base: 0 2px 12px rgba(0,0,0,.72);
}
@media (prefers-color-scheme: dark) {
  .daracl-cl[data-loading-theme="auto"]:not([data-loading-mode]) {
    --cl-surface-base: #1d1e1f; --cl-text-base: #cfd3dc; --cl-muted-base: #8d9095;
    --cl-border-base: #4c4d4f; --cl-hover-base: #303030; --cl-shadow-base: 0 2px 12px rgba(0,0,0,.72);
  }
}
.daracl-cl[data-loading-theme="light"], .daracl-cl[data-loading-theme="dark"] {
  --cl-surface: var(--cl-surface-base); --cl-text: var(--cl-text-base); --cl-muted: var(--cl-muted-base);
  --cl-border: var(--cl-border-base); --cl-hover: var(--cl-hover-base); --cl-shadow: var(--cl-shadow-base); --cl-accent: #2563eb;
}
.daracl-cl.daracl-cl-fullscreen {
  position: fixed; width: 100vw; height: 100vh; width: 100dvw; height: 100dvh;
}
.daracl-cl-backdrop {
  position: absolute; inset: 0; z-index: 1;
  background: var(--daracl-loading-backdrop, var(--cl-surface)); opacity: var(--daracl-loading-opacity, .3);
}
.daracl-cl-panel {
  position: relative; z-index: 10; text-align: center; margin: 0; box-sizing: border-box;
  max-width: calc(100% - 24px); max-height: calc(100% - 24px); overflow: auto;
  display: flex; flex-direction: column; align-items: center; gap: 12px; padding: 24px 28px;
  border: 1px solid var(--cl-border); border-radius: 16px; background: var(--cl-surface); box-shadow: var(--cl-shadow);
}
.daracl-cl-time, .daracl-cl-request-count { color: var(--cl-muted); font-size: 12px; font-variant-numeric: tabular-nums; }
.daracl-cl-actions { width: 100%; }
.daracl-cl-btn {
  min-height: 36px; padding: 6px 18px; border: 1px solid var(--cl-border); border-radius: 8px;
  background: var(--cl-surface); color: var(--cl-text); font: inherit; cursor: pointer;
}
.daracl-cl-btn:hover { background: var(--cl-hover); }
.daracl-cl-content { overflow-wrap: anywhere; }
.daracl-cl-spinner { display: block; flex-shrink: 0; }
.daracl-cl-track { stroke: var(--cl-border); }
.daracl-cl-arc { stroke: var(--cl-accent); transform-origin: 16px 16px; animation: daracl-cl-spin .8s linear infinite; }
@keyframes daracl-cl-spin { to { transform: rotate(360deg); } }
@media (prefers-reduced-motion: reduce) { .daracl-cl-arc { animation: none; } }
`;

function ensureLoadingStyles(): void {
  if (document.querySelector("style[data-daracl-loading-styles]")) return;
  const style = document.createElement("style");
  style.setAttribute("data-daracl-loading-styles", "");
  style.textContent = LOADING_CSS;
  (document.head || document.documentElement).appendChild(style);
}

const SVG_NS = "http://www.w3.org/2000/svg";

/** 스피너의 모양과 회전은 파일 내 CSS에서 처리합니다. */
function createSpinner(): SVGSVGElement {
  const svg = document.createElementNS(SVG_NS, "svg");
  svg.setAttribute("class", "daracl-cl-image daracl-cl-spinner");
  svg.setAttribute("viewBox", "0 0 32 32");
  svg.setAttribute("width", "32");
  svg.setAttribute("height", "32");
  svg.setAttribute("role", "img");
  svg.setAttribute("aria-label", "로딩 중");

  const track = document.createElementNS(SVG_NS, "circle");
  const arc = document.createElementNS(SVG_NS, "circle");
  for (const circle of [track, arc]) {
    circle.setAttribute("cx", "16");
    circle.setAttribute("cy", "16");
    circle.setAttribute("r", "13.5");
    circle.setAttribute("fill", "none");
    circle.setAttribute("stroke-width", "3");
  }
  track.setAttribute("class", "daracl-cl-track");
  arc.setAttribute("class", "daracl-cl-arc");
  arc.setAttribute("stroke-linecap", "round");
  arc.setAttribute("stroke-dasharray", "21 64");
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
  private changedStylePosition = false;
  private intervalId?: number;
  private timeoutId?: number;
  private group?: LoadingGroup;
  private startedAt = 0;

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
        const cancel = document.createElement("button");
        cancel.type = "button";
        cancel.className = "daracl-cl-btn";
        cancel.textContent = "Cancel";
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

    // 문서 전체 로딩은 화면 기준으로, 일반 요소 로딩은 컨테이너 기준으로 배치한다.
    const isFullscreen = containerNode === document.body || containerNode === document.documentElement;
    this.orginStylePosition = containerNode.style.position;
    const computedStyle = getComputedStyle(containerNode);

    this.changedStylePosition = !isFullscreen && !["absolute", "relative", "fixed", "sticky"].includes(computedStyle.position);
    if (this.changedStylePosition) {
      containerNode.style.position = "relative";
    }

    const opts = this.options;
    const theme = THEMES.includes(opts.theme) ? opts.theme : "auto";

    let zIndex = opts.zIndex;
    if(defaultOptions.zIndex == opts.zIndex){
      zIndex += ++G_LOADING_IDX;
    }

    // 옵션 값은 HTML 문자열에 끼워 넣지 않고 DOM API 로 설정해 속성 주입을 막는다
    ensureLoadingStyles();
    const root = document.createElement("div");
    root.className = isFullscreen ? "daracl-cl daracl-cl-fullscreen" : "daracl-cl";
    root.setAttribute("data-loading-theme", theme);
    const inheritedTheme = containerNode.closest("[data-daracl-theme]")?.getAttribute("data-daracl-theme");
    if (theme === "auto" && (inheritedTheme === "light" || inheritedTheme === "dark")) root.setAttribute("data-loading-mode", inheritedTheme);
    root.setAttribute("aria-label", "로딩 중");
    // 공개 옵션 값만 CSS 변수로 전달하고 외형과 배치는 CSS가 담당한다.
    root.style.setProperty("--daracl-loading-cursor", String(opts.cursor));
    root.style.setProperty("--daracl-loading-z-index", String(zIndex));
    root.style.setProperty("--daracl-loading-opacity", String(opts.opacity));
    if (opts.bgColor !== DEFAULT_BG_COLOR) root.style.setProperty("--daracl-loading-backdrop", String(opts.bgColor));

    const backdrop = document.createElement("div");
    backdrop.className = "daracl-cl-backdrop";

    const panel = document.createElement("div");
    panel.className = "daracl-cl-panel";
    // 패널은 오버레이 안에서 flex 로 가운데 배치하고 오버레이보다 커지지 않게 제한한다
    if (opts.loadingImg && isSafeImageUrl(opts.loadingImg)) {
      const image = document.createElement("img");
      image.className = "daracl-cl-image";
      image.setAttribute("src", opts.loadingImg);
      image.setAttribute("alt", "로딩 중");
      panel.appendChild(image);
    } else {
      panel.appendChild(createSpinner());
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
      if (renderer.changedStylePosition) renderer.containerNode.style.position = renderer.orginStylePosition || "";
      renderer.changedStylePosition = false;
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
