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


const instanceMap: Record<string, Loading> = {};

interface LoadingGroup {
  renderer: Loading;
  members: Set<Loading>;
}

// 선택자 문자열이 달라도 같은 DOM 컨테이너라면 하나의 화면을 공유합니다.
const loadingGroups = new WeakMap<HTMLElement, LoadingGroup>();


let G_LOADING_IDX =0;

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
  bgColor: "var(--daracl-loading-backdrop, #ffffff)",
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

    this.orginStylePosition = containerNode.style.position;
    const computedStyle = getComputedStyle(containerNode);

    if (!["absolute", "relative", "fixed", "sticky"].includes(computedStyle.position)) {
      containerNode.style.position = "relative";
    }

    const opts = this.options;

    let zIndex = opts.zIndex;
    if(defaultOptions.zIndex == opts.zIndex){
      zIndex += ++G_LOADING_IDX;
    }

    // 옵션 값은 HTML 문자열에 끼워 넣지 않고 DOM API 로 설정해 속성 주입을 막는다
    const root = document.createElement("div");
    root.className = "daracl-cl";
    root.setAttribute("data-loading-theme", THEMES.includes(opts.theme) ? opts.theme : "auto");
    root.setAttribute("aria-label", "로딩 중");
    root.style.setProperty("cursor", String(opts.cursor));
    root.style.setProperty("z-index", String(zIndex));

    const backdrop = document.createElement("div");
    backdrop.className = "daracl-cl-backdrop";
    backdrop.style.setProperty("background", String(opts.bgColor));
    backdrop.style.setProperty("opacity", String(opts.opacity));

    const panel = document.createElement("div");
    panel.className = "daracl-cl-panel";
    if (opts.loadingImg && isSafeImageUrl(opts.loadingImg)) {
      const image = document.createElement("img");
      image.className = "daracl-cl-image";
      image.setAttribute("src", opts.loadingImg);
      image.setAttribute("alt", "로딩 중");
      panel.appendChild(image);
    } else {
      const spinner = document.createElement("span");
      spinner.className = "daracl-cl-image daracl-cl-spinner";
      spinner.setAttribute("role", "img");
      spinner.setAttribute("aria-label", "로딩 중");
      panel.appendChild(spinner);
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
      existing = document.createElement("div");
      existing.className = "daracl-cl-content";
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
