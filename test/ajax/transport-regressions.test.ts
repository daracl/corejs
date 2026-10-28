import { FetchAjax } from "../../src/ajax/FetchAjax";
import { XHRAjax } from "../../src/ajax/XHRAjax";
import { Ajax } from "../../src/ajax/Ajax";

describe("Ajax transport regressions", () => {
  const originalFetch = global.fetch;
  afterEach(() => { global.fetch = originalFetch; jest.restoreAllMocks(); jest.useRealTimers(); });

  it.each([false, true])("times out without a loader, including response body reads: %s", async bodyPending => {
    jest.useFakeTimers();
    global.fetch = jest.fn((_url, init) => new Promise((resolve, reject) => {
      const abort = () => reject(Object.assign(new Error("aborted"), { name: "AbortError" }));
      if (bodyPending) {
        resolve({ ok: true, text: () => new Promise((_resolve, rejectBody) => {
          init!.signal!.addEventListener("abort", () => rejectBody(Object.assign(new Error("aborted"), { name: "AbortError" })));
        }) });
      } else init!.signal!.addEventListener("abort", abort);
    })) as any;
    const promise = new FetchAjax({}).request("/api", "GET", { timeout: 100 });
    const assertion = expect(promise).rejects.toMatchObject({ type: "timeout" });
    await Promise.resolve();
    jest.advanceTimersByTime(100);
    await assertion;
    expect(jest.getTimerCount()).toBe(0);
  });

  it("sets JSON headers and inserts encoded queries before fragments", async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: true, status: 200, text: async () => "{}", headers: { forEach: jest.fn() } });
    const transport = new FetchAjax({});
    await transport.request("/api", "POST", { data: { a: 1 } });
    expect(global.fetch).toHaveBeenLastCalledWith("/api", expect.objectContaining({ headers: { "Content-Type": "application/json" }, body: '{"a":1}' }));
    await transport.request("/api?x=1#section", "GET", { data: { value: "a&b" } });
    expect(global.fetch).toHaveBeenLastCalledWith("/api?x=1&value=a%26b#section", expect.anything());
  });

  it("honors an explicit XHR override", async () => {
    global.fetch = jest.fn();
    const xhr = jest.spyOn(XHRAjax.prototype, "request").mockResolvedValue({ status: 200 });
    await new Ajax({ fetchMode: "fetch" }).get("/api", {}, false);
    expect(xhr).toHaveBeenCalledTimes(1);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("opens XHR once and respects lowercase form headers without mutating options", async () => {
    const open = jest.spyOn(XMLHttpRequest.prototype, "open").mockImplementation(() => {});
    const header = jest.spyOn(XMLHttpRequest.prototype, "setRequestHeader").mockImplementation(() => {});
    jest.spyOn(XMLHttpRequest.prototype, "send").mockImplementation(function(this: XMLHttpRequest) {
      Object.defineProperties(this, { readyState: { value: 4 }, status: { value: 200 }, responseText: { value: "ok" } });
      this.onreadystatechange!(new Event("readystatechange"));
    });
    jest.spyOn(XMLHttpRequest.prototype, "getAllResponseHeaders").mockReturnValue("");
    const headers = { "content-type": "application/x-www-form-urlencoded" };
    await new XHRAjax({}).request("/api", "POST", { data: { a: "b&c" }, headers });
    expect(open).toHaveBeenCalledTimes(1);
    expect(header).toHaveBeenCalledTimes(1);
    expect(XMLHttpRequest.prototype.send).toHaveBeenCalledWith("a=b%26c");
    expect(headers).toEqual({ "content-type": "application/x-www-form-urlencoded" });
  });
});
