import { Ajax } from "../../src/ajax/Ajax";
import { FetchAjax } from "../../src/ajax/FetchAjax";
import { Loading } from "../../src/Loading";

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((res, rej) => { resolve = res; reject = rej; });
  return { promise, resolve, reject };
}

const response = (status = 200) => ({ status, statusText: "", text: async () => "{}", headers: { forEach: jest.fn() } });
const counter = () => document.querySelector(".daracl-cl-request-count")?.textContent;

describe("진행 중 Ajax 요청과 공유 Loading", () => {
  const originalFetch = global.fetch;
  beforeEach(() => { document.body.innerHTML = '<div id="target" style="position: absolute"></div>'; });
  afterEach(() => {
    Loading.destroy("body");
    Loading.destroy("#target");
    global.fetch = originalFetch;
    jest.restoreAllMocks();
    jest.useRealTimers();
    document.body.innerHTML = "";
  });

  it.each([0, 1])("동일 URL 요청을 구분하고 %s번째 요청이 먼저 끝나도 화면을 유지한다", async first => {
    const pending = [deferred<ReturnType<typeof response>>(), deferred<ReturnType<typeof response>>()];
    global.fetch = jest.fn().mockReturnValueOnce(pending[0].promise).mockReturnValueOnce(pending[1].promise);
    const ajax = Ajax.create({ baseUrl: "/api", fetchMode: "fetch", loaderContainer: "#target", loaderOption: { enableRequestCount: true } });
    const requests = [ajax.get("/same"), ajax.get("/same")];
    const snapshot = ajax.pendingRequests;
    expect(snapshot.size).toBe(2);
    expect(new Set(snapshot.keys()).size).toBe(2);
    expect([...snapshot.values()][0]).toMatchObject({ url: "/api/same", method: "GET", startedAt: expect.any(Number) });
    expect(Object.isFrozen([...snapshot.values()][0])).toBe(true);
    (snapshot as Map<number, unknown>).clear();
    expect(ajax.pendingRequests.size).toBe(2);
    expect(document.querySelectorAll(".daracl-cl")).toHaveLength(1);
    expect(counter()).toBe("진행 중 요청: 2");
    pending[first].resolve(response());
    await requests[first];
    expect(ajax.pendingRequests.size).toBe(1);
    expect(counter()).toBe("진행 중 요청: 1");
    expect(document.querySelector<HTMLElement>("#target")!.style.position).toBe("absolute");
    pending[1 - first].resolve(response());
    await requests[1 - first];
    expect(ajax.pendingRequests.size).toBe(0);
    expect(document.querySelector(".daracl-cl")).toBeNull();
    expect(Loading.instance("#target")).toBeUndefined();
  });

  it("HTTP 오류와 네트워크 오류가 발생한 요청을 제거한다", async () => {
    global.fetch = jest.fn().mockResolvedValueOnce(response(500)).mockRejectedValueOnce(new Error("offline"));
    const ajax = new Ajax({ fetchMode: "fetch", enableDefaultLoader: true, loaderOption: { enableRequestCount: true } });
    await expect(ajax.get("/error")).rejects.toMatchObject({ type: "http" });
    await expect(ajax.get("/offline")).rejects.toMatchObject({ type: "network" });
    expect(ajax.pendingRequests.size).toBe(0);
    expect(document.querySelector(".daracl-cl")).toBeNull();
  });

  it("외부 취소 시 해당 요청만 제거하고 나머지 요청을 유지한다", async () => {
    const other = deferred<ReturnType<typeof response>>();
    global.fetch = jest.fn().mockImplementationOnce((_url, init: RequestInit) => new Promise((_res, reject) => {
      init.signal!.addEventListener("abort", () => reject(Object.assign(new Error("abort"), { name: "AbortError" })));
    })).mockReturnValueOnce(other.promise);
    const ajax = new Ajax({ fetchMode: "fetch", enableDefaultLoader: true, loaderOption: { enableRequestCount: true } });
    const controller = new AbortController();
    const first = ajax.get("/first", { signal: controller.signal });
    const second = ajax.get("/second");
    const assertion = expect(first).rejects.toMatchObject({ type: "abort" });
    controller.abort();
    await assertion;
    expect(ajax.pendingRequests.size).toBe(1);
    expect(counter()).toBe("진행 중 요청: 1");
    other.resolve(response());
    await second;
    expect(ajax.pendingRequests.size).toBe(0);
  });

  it("타임아웃과 전송 준비 중 예외에서도 Map을 비운다", async () => {
    jest.useFakeTimers();
    global.fetch = jest.fn((_url, init) => new Promise((_res, reject) => {
      init!.signal!.addEventListener("abort", () => reject(Object.assign(new Error("abort"), { name: "AbortError" })));
    })) as typeof fetch;
    const ajax = new Ajax({ fetchMode: "fetch", enableDefaultLoader: true, loaderOption: { enableRequestCount: true } });
    const request = ajax.get("/timeout", { timeout: 10 });
    const assertion = expect(request).rejects.toMatchObject({ type: "timeout" });
    jest.advanceTimersByTime(10);
    await assertion;
    expect(ajax.pendingRequests.size).toBe(0);
    jest.spyOn(FetchAjax.prototype, "request").mockImplementation(() => { throw new Error("prepare"); });
    await expect(ajax.get("/prepare")).rejects.toThrow("prepare");
    expect(ajax.pendingRequests.size).toBe(0);
    expect(document.querySelector(".daracl-cl")).toBeNull();
  });

  it("beforeRequest에서 Map을 조회할 수 있고 콜백 예외도 정리한다", async () => {
    global.fetch = jest.fn();
    const ajax = new Ajax({ fetchMode: "fetch", enableDefaultLoader: true });
    await expect(ajax.get("/hook", { beforeRequest: () => {
      expect(ajax.pendingRequests.size).toBe(1);
      throw new Error("hook");
    } })).rejects.toThrow("hook");
    expect(ajax.pendingRequests.size).toBe(0);
    expect(document.querySelector(".daracl-cl")).toBeNull();
  });

  it("카운트는 기본적으로 숨기고 로더를 끈 요청도 Map에는 등록한다", async () => {
    const first = deferred<ReturnType<typeof response>>();
    const second = deferred<ReturnType<typeof response>>();
    global.fetch = jest.fn().mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);
    const ajax = new Ajax({ fetchMode: "fetch", enableDefaultLoader: true });
    const a = ajax.get("/visible");
    const b = ajax.get("/hidden", { enableLoader: false });
    expect(ajax.pendingRequests.size).toBe(2);
    expect(counter()).toBeUndefined();
    first.resolve(response());
    await a;
    expect(document.querySelector(".daracl-cl")).toBeNull();
    expect(ajax.pendingRequests.size).toBe(1);
    second.resolve(response());
    await b;
  });

  it("Ajax 인스턴스의 Map은 독립적이고 같은 컨테이너의 표시 수는 합산한다", async () => {
    const a = deferred<ReturnType<typeof response>>();
    const b = deferred<ReturnType<typeof response>>();
    global.fetch = jest.fn().mockReturnValueOnce(a.promise).mockReturnValueOnce(b.promise);
    const options = { fetchMode: "fetch" as const, enableDefaultLoader: true, loaderOption: { enableRequestCount: true } };
    const first = new Ajax(options);
    const second = new Ajax(options);
    const one = first.get("/one");
    const two = second.get("/two");
    expect(first.pendingRequests.size).toBe(1);
    expect(second.pendingRequests.size).toBe(1);
    expect(counter()).toBe("진행 중 요청: 2");
    a.resolve(response());
    await one;
    expect(first.pendingRequests.size).toBe(0);
    expect(second.pendingRequests.size).toBe(1);
    expect(counter()).toBe("진행 중 요청: 1");
    b.resolve(response());
    await two;
  });

  it("공유 취소 버튼은 연결된 모든 요청을 취소한다", async () => {
    global.fetch = jest.fn((_url, init) => new Promise((_res, reject) => {
      init!.signal!.addEventListener("abort", () => reject(Object.assign(new Error("abort"), { name: "AbortError" })));
    })) as typeof fetch;
    const ajax = new Ajax({ fetchMode: "fetch", enableDefaultLoader: true, loaderOption: { enableRequestCount: true, enableCancelButton: true } });
    const requests = [ajax.get("/a"), ajax.get("/b")];
    const assertions = requests.map(request => expect(request).rejects.toMatchObject({ type: "abort" }));
    document.querySelector<HTMLButtonElement>(".daracl-cl-btn")!.click();
    await Promise.all(assertions);
    expect(ajax.pendingRequests.size).toBe(0);
    expect(document.querySelector(".daracl-cl")).toBeNull();
  });

  it("XHR에서도 겹친 요청을 추적하고 마지막 완료 시 화면을 닫는다", async () => {
    const instances: XMLHttpRequest[] = [];
    jest.spyOn(XMLHttpRequest.prototype, "open").mockImplementation(function(this: XMLHttpRequest) { instances.push(this); });
    jest.spyOn(XMLHttpRequest.prototype, "setRequestHeader").mockImplementation(() => {});
    jest.spyOn(XMLHttpRequest.prototype, "getAllResponseHeaders").mockReturnValue("");
    jest.spyOn(XMLHttpRequest.prototype, "send").mockImplementation(() => {});
    const ajax = new Ajax({ fetchMode: "xhr", enableDefaultLoader: true, loaderOption: { enableRequestCount: true } });
    const requests = [ajax.get("/a"), ajax.get("/b")];
    expect(ajax.pendingRequests.size).toBe(2);
    expect(counter()).toBe("진행 중 요청: 2");
    for (const index of [0, 1]) {
      Object.defineProperties(instances[index], { readyState: { value: 4 }, status: { value: 200 }, responseText: { value: "{}" } });
      instances[index].onreadystatechange!(new Event("readystatechange"));
      await requests[index];
      expect(ajax.pendingRequests.size).toBe(1 - index);
    }
    expect(document.querySelector(".daracl-cl")).toBeNull();
  });

  it("완료한 로더를 다시 hide해도 다음 로딩 화면을 해제하지 않는다", () => {
    jest.useFakeTimers();
    const a = new Loading("#target", { enableRequestCount: true, requestCount: 1, enableTime: true });
    const b = new Loading("#target", { requestCount: 1 });
    a.hide();
    expect(counter()).toBeUndefined();
    expect(jest.getTimerCount()).toBe(1);
    b.hide();
    expect(jest.getTimerCount()).toBe(0);
    const next = new Loading("#target", { enableRequestCount: true, requestCount: 3 });
    a.hide();
    b.hide();
    expect(counter()).toBe("진행 중 요청: 3");
    next.setRequestCount(2);
    expect(counter()).toBe("진행 중 요청: 2");
    next.hide();
    expect(document.querySelector(".daracl-cl")).toBeNull();
  });

  it("컨테이너별 카운트는 독립적이며 선택자와 HTMLElement는 같은 화면을 공유한다", () => {
    const target = document.querySelector<HTMLElement>("#target")!;
    const first = new Loading("#target", { enableRequestCount: true, requestCount: 1 });
    const second = new Loading(target, { enableRequestCount: true, requestCount: 1 });
    const other = document.createElement("section");
    document.body.append(other);
    const third = new Loading(other, { enableRequestCount: true, requestCount: 4 });
    expect(target.querySelectorAll(".daracl-cl")).toHaveLength(1);
    expect(target.querySelector(".daracl-cl-request-count")!.textContent).toBe("진행 중 요청: 2");
    expect(other.querySelector(".daracl-cl-request-count")!.textContent).toBe("진행 중 요청: 4");
    first.hide();
    expect(target.querySelector(".daracl-cl-request-count")!.textContent).toBe("진행 중 요청: 1");
    second.hide();
    expect(other.querySelector(".daracl-cl")).not.toBeNull();
    third.hide();
  });

  it("정적 destroy는 공유 화면의 모든 타이머와 선택자 조회를 정리한다", () => {
    jest.useFakeTimers();
    new Loading("#target", { enableTime: true, timeout: 1000 });
    new Loading("div#target", { enableRequestCount: true, requestCount: 1 });
    Loading.destroy("#target");
    expect(Loading.instance("#target")).toBeUndefined();
    expect(Loading.instance("div#target")).toBeUndefined();
    expect(document.querySelector(".daracl-cl")).toBeNull();
    expect(jest.getTimerCount()).toBe(0);
  });

  it("허용되지 않은 메서드는 전송하거나 추적하지 않는다", async () => {
    global.fetch = jest.fn();
    const ajax = new Ajax({ fetchMode: "fetch" });
    await expect(ajax.request({ method: "INVALID", url: "/api" })).rejects.toMatchObject({ status: 405 });
    expect(ajax.pendingRequests.size).toBe(0);
    expect(global.fetch).not.toHaveBeenCalled();
  });
});
