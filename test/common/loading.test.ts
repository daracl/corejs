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
