import { Ajax } from "../../src/ajax/Ajax";
import { FetchAjax } from "../../src/ajax/FetchAjax";
import { XHRAjax } from "../../src/ajax/XHRAjax";

describe("Ajax request options", () => {
  const originalFetch = global.fetch;
  const response = (status = 200) => ({ status, ok: status >= 200 && status < 300, text: async () => '{"value":1}', headers: { forEach: jest.fn() } });
  afterEach(() => { global.fetch = originalFetch; jest.restoreAllMocks(); document.body.innerHTML = ""; });

  it("merges global params, overrides transport and disables the default loader", async () => {
    global.fetch = jest.fn().mockResolvedValue(response());
    const beforeRequest = jest.fn();
    const beforeResponse = jest.fn();
    const controller = new AbortController();
    const ajax = Ajax.create({ baseUrl: "/api", fetchMode: "xhr", enableDefaultLoader: true,
      params: { locale: "ko", page: 1 }, beforeRequest, beforeResponse, signal: controller.signal });
    const result = await ajax.post("/items#list", { fetchMode: "fetch", enableLoader: false,
      credentials: "include", params: { page: 2 }, data: { name: "item" } });
    expect(global.fetch).toHaveBeenCalledWith("/api/items?locale=ko&page=2#list", expect.objectContaining({ credentials: "include", body: '{"name":"item"}' }));
    expect(result.config.signal).toBe(controller.signal);
    expect(beforeRequest).toHaveBeenCalledTimes(1);
    expect(beforeResponse).toHaveBeenCalledWith(result, expect.anything(), null);
    expect(document.querySelector(".daracl-cl")).toBeNull();
  });

  it("preserves an HTMLElement loader container and hides it after the request", async () => {
    global.fetch = jest.fn().mockImplementation(async () => {
      expect(container.querySelector(".daracl-cl")).not.toBeNull();
      return response();
    });
    const container = document.createElement("div");
    document.body.append(container);
    await new Ajax({ fetchMode: "fetch", loaderContainer: container }).get("/items");
    expect(container.querySelector(".daracl-cl")).toBeNull();
  });

  it.each(["fetch", "xhr"] as const)("does not send an already aborted %s request", async mode => {
    global.fetch = jest.fn();
    jest.spyOn(XMLHttpRequest.prototype, "open").mockImplementation(() => {});
    jest.spyOn(XMLHttpRequest.prototype, "setRequestHeader").mockImplementation(() => {});
    const send = jest.spyOn(XMLHttpRequest.prototype, "send").mockImplementation(() => {});
    const controller = new AbortController();
    controller.abort();
    await expect(new Ajax({ fetchMode: mode }).get("/api", { signal: controller.signal })).rejects.toMatchObject({ type: "abort" });
    expect(global.fetch).not.toHaveBeenCalled();
    expect(send).not.toHaveBeenCalled();
  });

  it("forwards external cancellation to fetch and removes its listener", async () => {
    const controller = new AbortController();
    const remove = jest.spyOn(controller.signal, "removeEventListener");
    global.fetch = jest.fn((_url, init) => new Promise((_resolve, reject) => {
      init!.signal!.addEventListener("abort", () => reject(Object.assign(new Error("abort"), { name: "AbortError" })));
    })) as any;
    const request = new FetchAjax({}).request("/api", "GET", { signal: controller.signal });
    const assertion = expect(request).rejects.toMatchObject({ type: "abort" });
    controller.abort();
    await assertion;
    expect(remove).toHaveBeenCalledWith("abort", expect.any(Function));
  });

  function mockXHR(status = 200, complete = true) {
    let instance: XMLHttpRequest;
    jest.spyOn(XMLHttpRequest.prototype, "open").mockImplementation(function(this: XMLHttpRequest) { instance = this; });
    jest.spyOn(XMLHttpRequest.prototype, "setRequestHeader").mockImplementation(() => {});
    jest.spyOn(XMLHttpRequest.prototype, "getAllResponseHeaders").mockReturnValue("");
    const send = jest.spyOn(XMLHttpRequest.prototype, "send").mockImplementation(function(this: XMLHttpRequest) {
      if (!complete) return;
      Object.defineProperties(this, { readyState: { value: 4 }, status: { value: status }, responseText: { value: '{"value":1}' } });
      this.onreadystatechange!(new Event("readystatechange"));
    });
    return { send, get instance() { return instance!; } };
  }

  it("sets XHR credentials, query params and passes the real XHR to hooks", async () => {
    const mock = mockXHR();
    const beforeRequest = jest.fn();
    const beforeResponse = jest.fn();
    const controller = new AbortController();
    const remove = jest.spyOn(controller.signal, "removeEventListener");
    const result = await new XHRAjax({}).request("/api", "POST", { credentials: "include", params: { q: "a&b" }, data: { value: 1 }, beforeRequest, beforeResponse, signal: controller.signal });
    expect(XMLHttpRequest.prototype.open).toHaveBeenCalledWith("POST", "/api?q=a%26b", true);
    expect(mock.instance.withCredentials).toBe(true);
    expect(beforeRequest).toHaveBeenCalledWith(expect.anything(), mock.instance, null);
    expect(beforeResponse).toHaveBeenCalledWith(result, mock.instance, null);
    expect(remove).toHaveBeenCalledWith("abort", expect.any(Function));
  });

  it("aborts an active XHR and removes the external signal listener", async () => {
    const mock = mockXHR(200, false);
    const abort = jest.spyOn(XMLHttpRequest.prototype, "abort").mockImplementation(() => {});
    const controller = new AbortController();
    const remove = jest.spyOn(controller.signal, "removeEventListener");
    const request = new XHRAjax({}).request("/api", "GET", { signal: controller.signal });
    const assertion = expect(request).rejects.toMatchObject({ type: "abort" });
    controller.abort();
    await assertion;
    expect(mock.send).toHaveBeenCalledTimes(1);
    expect(abort).toHaveBeenCalledTimes(1);
    expect(remove).toHaveBeenCalledWith("abort", expect.any(Function));
  });

  it.each(["fetch", "xhr"] as const)("supports custom status validation in %s", async mode => {
    global.fetch = jest.fn().mockResolvedValue(response(404));
    mockXHR(404);
    const transport = mode === "fetch" ? new FetchAjax({}) : new XHRAjax({});
    await expect(transport.request("/api", "GET", { validateStatus: status => status === 404 })).resolves.toMatchObject({ status: 404 });
    await expect(transport.request("/api", "GET", {})).rejects.toMatchObject({ type: "http", status: 404 });
  });

  it("rejects unsupported cookie omission in XHR explicitly", async () => {
    await expect(new XHRAjax({}).request("/api", "GET", { credentials: "omit" })).rejects.toThrow('requires fetch');
  });

  it("hides the loader when a response callback throws", async () => {
    global.fetch = jest.fn().mockResolvedValue(response());
    await expect(new Ajax({ fetchMode: "fetch", enableDefaultLoader: true }).get("/api", {
      beforeResponse: () => { throw new Error("hook failed"); },
    })).rejects.toMatchObject({ error: expect.objectContaining({ message: "hook failed" }) });
    expect(document.querySelector(".daracl-cl")).toBeNull();
  });
});
