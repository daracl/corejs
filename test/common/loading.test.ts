import { Loading } from "../../src/Loading";

describe("Loading 공유 화면 수명주기", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    document.body.innerHTML = '<div id="loading-target"></div>';
  });
  afterEach(() => {
    Loading.destroy("#loading-target");
    document.body.innerHTML = "";
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it("각 참여자의 timeout은 해당 참여자만 숨긴다", () => {
    const first = new Loading("#loading-target", { timeout: 1000 });
    const second = new Loading("#loading-target", { timeout: 2000 });
    jest.advanceTimersByTime(1000);
    expect(document.querySelector(".daracl-cl")).not.toBeNull();
    expect(Loading.instance("#loading-target")).toBe(second);
    first.hide();
    jest.advanceTimersByTime(1000);
    expect(document.querySelector(".daracl-cl")).toBeNull();
    expect(jest.getTimerCount()).toBe(0);
  });

  it("먼저 숨긴 참여자의 timeout은 남은 화면에 영향을 주지 않는다", () => {
    const first = new Loading("#loading-target", { timeout: 1000 });
    new Loading("#loading-target");
    first.hide();
    expect(jest.getTimerCount()).toBe(0);
    jest.advanceTimersByTime(2000);
    expect(document.querySelector(".daracl-cl")).not.toBeNull();
  });

  it("나중 참여자의 표시 옵션을 반영하고 퇴장하면 되돌린다", () => {
    new Loading("#loading-target", { content: "<b>first</b>" });
    const second = new Loading("#loading-target", { content: "<i>second</i>", enableTime: true, enableCancelButton: true });
    expect(document.querySelector(".daracl-cl-content i")?.textContent).toBe("second");
    expect(document.querySelector(".daracl-cl-btn")).not.toBeNull();
    jest.advanceTimersByTime(1000);
    expect(document.querySelector(".daracl-cl-time")?.textContent).toBe("1");
    second.hide();
    expect(document.querySelector(".daracl-cl-content b")?.textContent).toBe("first");
    expect(document.querySelector(".daracl-cl-btn")).toBeNull();
    expect(document.querySelector(".daracl-cl-time")).toBeNull();
    expect(jest.getTimerCount()).toBe(0);
  });

  it("재표시하면 정적 조회와 제거를 복구하고 반복 show는 timeout을 연장하지 않는다", () => {
    const loading = new Loading("#loading-target", { timeout: 1000 });
    loading.hide();
    loading.show();
    expect(Loading.instance("#loading-target")).toBe(loading);
    jest.advanceTimersByTime(500);
    loading.show();
    jest.advanceTimersByTime(500);
    expect(document.querySelector(".daracl-cl")).toBeNull();
    loading.show();
    Loading.destroy("#loading-target");
    expect(document.querySelector(".daracl-cl")).toBeNull();
    expect(jest.getTimerCount()).toBe(0);
  });

  it("취소 콜백 예외에도 다른 참여자를 처리하고 false는 유지한다", () => {
    const error = new Error("cancel failed");
    const errors = jest.fn((event: ErrorEvent) => event.preventDefault());
    window.addEventListener("error", errors);
    try {
      new Loading("#loading-target", { enableCancelButton: true, callback: () => { throw error; } });
      const callback = jest.fn(() => false);
      const remaining = new Loading("#loading-target", { callback });
      (document.querySelector(".daracl-cl-btn") as HTMLButtonElement).click();
      expect(callback).toHaveBeenCalledTimes(1);
      expect(errors).toHaveBeenCalledTimes(1);
      expect(Loading.instance("#loading-target")).toBe(remaining);
      remaining.hide();
      expect(document.querySelector(".daracl-cl")).toBeNull();
    } finally {
      window.removeEventListener("error", errors);
    }
  });
});


describe("Loading positioning", () => {
  it.each(["body", "html", "body:first-of-type", document.body, document.documentElement, null])("uses fixed for document target %s without changing its position", (target) => {
    const container = target === "html" || target === document.documentElement ? document.documentElement : document.body;
    const original = container.style.position;
    container.style.position = "static";
    const loading = new Loading(target);
    try {
      const root = container.querySelector<HTMLElement>(":scope > .daracl-cl")!;
      expect(getComputedStyle(root).position).toBe("fixed");
      expect(container.style.position).toBe("static");
      expect(getComputedStyle(root.querySelector<HTMLElement>(".daracl-cl-backdrop")!).position).toBe("absolute");
      container.style.position = "relative";
      loading.hide();
      expect(container.style.position).toBe("relative");
      loading.show();
      expect(getComputedStyle(container.querySelector<HTMLElement>(":scope > .daracl-cl")!).position).toBe("fixed");
    } finally {
      loading.hide();
      container.style.position = original;
    }
  });

  it.each(["", "absolute", "relative", "fixed", "sticky"])("restores container position=%s after the last shared loader exits", (position) => {
    const container = document.createElement("div");
    container.style.position = position;
    document.body.appendChild(container);
    const first = new Loading(container);
    const second = new Loading(container);
    try {
      expect(getComputedStyle(container.querySelector<HTMLElement>(".daracl-cl")!).position).toBe("absolute");
      expect(container.style.position).toBe(position || "relative");
      first.hide();
      expect(container.querySelector(".daracl-cl")).not.toBeNull();
      expect(container.style.position).toBe(position || "relative");
      second.hide();
      expect(container.querySelector(".daracl-cl")).toBeNull();
      expect(container.style.position).toBe(position);
    } finally {
      first.hide();
      second.hide();
      container.remove();
    }
  });
});


describe("Loading 파일 내 CSS", () => {
  afterEach(() => { Loading.destroy("body"); jest.restoreAllMocks(); });

  it("공통 스타일은 한 번 등록하고 화면 이동 이벤트를 구독하지 않는다", () => {
    const addWindow = jest.spyOn(window, "addEventListener");
    const first = new Loading("body", { enableCancelButton: true, enableTime: true });
    const root = document.body.querySelector<HTMLElement>(":scope > .daracl-cl")!;
    const css = document.querySelector("style[data-daracl-loading-styles]")!.textContent!;
    expect(root.style.position).toBe("");
    expect(root.style.width).toBe("");
    expect(root.style.height).toBe("");
    expect(getComputedStyle(root).display).toBe("flex");
    expect(css).toContain("100dvh");
    expect(css).toContain(".daracl-cl-btn:hover");
    expect(css).toContain("prefers-reduced-motion");
    expect(root.querySelector("animateTransform")).toBeNull();
    expect(root.querySelector(".daracl-cl-panel")!.hasAttribute("style")).toBe(false);
    expect(root.querySelector(".daracl-cl-btn")!.hasAttribute("style")).toBe(false);
    expect(addWindow.mock.calls.some(([type]) => type === "scroll" || type === "resize")).toBe(false);
    first.hide();
    first.show();
    expect(document.querySelectorAll("style[data-daracl-loading-styles]")).toHaveLength(1);
    first.hide();
  });

  it("공개 외형 옵션은 CSS 변수로 전달하고 테마를 유지한다", () => {
    const loading = new Loading("body", { bgColor: "red", opacity: "0.5", cursor: "progress", zIndex: 123, theme: "dark" });
    const root = document.body.querySelector<HTMLElement>(":scope > .daracl-cl")!;
    expect(root.style.getPropertyValue("--daracl-loading-backdrop")).toBe("red");
    expect(root.style.getPropertyValue("--daracl-loading-opacity")).toBe("0.5");
    expect(root.style.getPropertyValue("--daracl-loading-cursor")).toBe("progress");
    expect(root.style.getPropertyValue("--daracl-loading-z-index")).toBe("123");
    expect(root.getAttribute("data-loading-theme")).toBe("dark");
    loading.hide();
  });
});
