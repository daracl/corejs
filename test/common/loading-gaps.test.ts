import { Loading } from "../../src/Loading";

describe("Loading 보강", () => {
  beforeEach(() => { document.body.innerHTML = '<div id="t"></div>'; });
  afterEach(() => { jest.useRealTimers(); document.body.innerHTML = ""; });

  it("선택자가 비어 있으면 body 에 표시한다", () => {
    const loading = new Loading(null);
    expect(document.querySelector("body > .daracl-cl")).not.toBeNull();
    loading.hide();
    expect(document.querySelector(".daracl-cl")).toBeNull();
    new Loading("").hide();
  });

  it("timeout 이 지나면 자동으로 사라진다", () => {
    jest.useFakeTimers();
    new Loading("#t", { timeout: 50 });
    jest.advanceTimersByTime(49);
    expect(document.querySelector(".daracl-cl")).not.toBeNull();
    jest.advanceTimersByTime(1);
    expect(document.querySelector(".daracl-cl")).toBeNull();
  });

  it("취소 버튼은 callback 이 false 를 반환하면 로더를 유지하고 그 외에는 숨긴다", () => {
    let keep = true;
    const callback = jest.fn(() => (keep ? false : true));
    new Loading("#t", { enableCancelButton: true, callback });
    const button = () => document.querySelector<HTMLButtonElement>(".daracl-cl-btn")!;
    button().click();
    expect(callback).toHaveBeenCalledTimes(1);
    expect(document.querySelector(".daracl-cl")).not.toBeNull();
    keep = false;
    button().click();
    expect(document.querySelector(".daracl-cl")).toBeNull();
  });

  it("callback 이 예외를 던지면 로더를 숨기고 예외를 다시 던진다", () => {
    const loading = new Loading("#t", { enableCancelButton: true, callback: () => { throw new Error("cancel failed"); } });
    expect(() => (loading as any).cancelHandler()).toThrow("cancel failed");
    expect(document.querySelector(".daracl-cl")).toBeNull();
  });

  it("요청 수를 표시하고 비정상 값은 0 으로 보정한다", () => {
    const loading = new Loading("#t", { enableRequestCount: true, requestCount: 2 });
    const counter = () => document.querySelector(".daracl-cl-request-count")?.textContent;
    expect(counter()).toBe("진행 중 요청: 2");
    loading.setRequestCount(5.9);
    expect(counter()).toBe("진행 중 요청: 5");
    loading.setRequestCount(Number.NaN);
    expect(counter()).toBe("진행 중 요청: 0");
    loading.setRequestCount(-3);
    expect(counter()).toBe("진행 중 요청: 0");
    loading.hide();
  });

  it("같은 컨테이너의 로더는 화면을 공유하고 마지막 해제 때 닫힌다", () => {
    const first = new Loading("#t", { enableRequestCount: true, requestCount: 1 });
    const second = new Loading("#t", { requestCount: 2 });
    expect(document.querySelectorAll("#t > .daracl-cl")).toHaveLength(1);
    expect(document.querySelector(".daracl-cl-request-count")?.textContent).toBe("진행 중 요청: 3");
    first.hide();
    expect(document.querySelector("#t > .daracl-cl")).not.toBeNull();
    second.hide();
    expect(document.querySelector(".daracl-cl")).toBeNull();
  });

  it("Loading.instance 와 destroy", () => {
    const loading = new Loading("#t");
    expect(Loading.instance("#t")).toBe(loading);
    Loading.destroy("#t");
    expect(document.querySelector(".daracl-cl")).toBeNull();
    expect(Loading.instance("#t")).toBeUndefined();
    expect(() => Loading.destroy("#none")).not.toThrow();
  });
});
