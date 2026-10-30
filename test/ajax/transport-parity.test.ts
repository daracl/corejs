import { Ajax } from "../../src/ajax/Ajax";
import { FetchAjax } from "../../src/ajax/FetchAjax";
import { XHRAjax } from "../../src/ajax/XHRAjax";

describe("Fetch/XHR 동작 일치와 오류 분류", () => {
  const originalFetch = global.fetch;
  afterEach(() => { global.fetch = originalFetch; jest.restoreAllMocks(); });

  const fetchResponse = (status: number, text: string) => ({
    status,
    statusText: "",
    ok: status >= 200 && status < 300,
    text: async () => text,
    headers: { forEach: () => {} },
  });

  /** XHR 를 모킹하고 설정된 헤더를 기록한다 */
  function mockXHR(status: number, responseText: string) {
    const headers: Record<string, string> = {};
    jest.spyOn(XMLHttpRequest.prototype, "open").mockImplementation(() => {});
    jest.spyOn(XMLHttpRequest.prototype, "setRequestHeader").mockImplementation((k: string, v: string) => { headers[k] = v; });
    jest.spyOn(XMLHttpRequest.prototype, "getAllResponseHeaders").mockReturnValue("");
    jest.spyOn(XMLHttpRequest.prototype, "send").mockImplementation(function (this: XMLHttpRequest) {
      Object.defineProperties(this, { readyState: { value: 4 }, status: { value: status }, responseText: { value: responseText } });
      this.onreadystatechange!(new Event("readystatechange"));
    });
    return headers;
  }

  const transports = { fetch: () => new FetchAjax({}), xhr: () => new XHRAjax({}) };

  it("validMethods 는 기본값과 병합하지 않고 교체한다", async () => {
    const ajax = new Ajax({ validMethods: ["get"] });
    await expect(ajax.post("/api", {})).rejects.toMatchObject({ status: 405 });
  });

  it("validMethods 로 PATCH 를 허용할 수 있다", async () => {
    global.fetch = jest.fn().mockResolvedValue(fetchResponse(200, "{}"));
    const ajax = new Ajax({ fetchMode: "fetch", validMethods: ["PATCH"] });
    await expect(ajax.request({ url: "/api", method: "patch" })).resolves.toMatchObject({ status: 200 });
  });

  it.each(["fetch", "xhr"] as const)("값이 없는 헤더는 %s 에서 보내지 않는다", async mode => {
    const xhrHeaders = mockXHR(200, "{}");
    global.fetch = jest.fn().mockResolvedValue(fetchResponse(200, "{}"));
    await transports[mode]().request("/api", "POST", { headers: { Authorization: undefined, "X-Empty": "", "X-Ok": "1" }, data: { a: 1 } });
    const sent = mode === "fetch" ? (global.fetch as jest.Mock).mock.calls[0][1].headers : xhrHeaders;
    expect(sent).toMatchObject({ "X-Ok": "1" });
    expect(sent).not.toHaveProperty("Authorization");
    expect(sent).not.toHaveProperty("X-Empty");
  });

  it("XHR 은 GET 에 기본 Content-Type 을 붙이지 않는다", async () => {
    const headers = mockXHR(200, "{}");
    await new XHRAjax({}).request("/api", "GET", { data: { a: 1 } });
    expect(headers).not.toHaveProperty("Content-Type");
  });

  it.each(["fetch", "xhr"] as const)("문자열 본문은 %s 에서 form-urlencoded 로 보낸다", async mode => {
    const xhrHeaders = mockXHR(200, "{}");
    global.fetch = jest.fn().mockResolvedValue(fetchResponse(200, "{}"));
    await transports[mode]().request("/api", "POST", { data: "a=1" });
    const sent = mode === "fetch" ? (global.fetch as jest.Mock).mock.calls[0][1].headers : xhrHeaders;
    expect(sent["Content-Type"]).toBe("application/x-www-form-urlencoded");
  });

  it.each(["fetch", "xhr"] as const)("beforeRequest 예외는 %s 에서 callback AjaxError 가 된다", async mode => {
    mockXHR(200, "{}");
    global.fetch = jest.fn().mockResolvedValue(fetchResponse(200, "{}"));
    const boom = new Error("before failed");
    await expect(transports[mode]().request("/api", "GET", { beforeRequest: () => { throw boom; } }))
      .rejects.toMatchObject({ name: "AjaxError", type: "callback", error: boom });
  });

  it.each(["fetch", "xhr"] as const)("beforeResponse 예외는 %s 에서 network 가 아닌 callback 이다", async mode => {
    mockXHR(200, "{}");
    global.fetch = jest.fn().mockResolvedValue(fetchResponse(200, "{}"));
    const boom = new Error("after failed");
    await expect(transports[mode]().request("/api", "GET", { beforeResponse: () => { throw boom; } }))
      .rejects.toMatchObject({ type: "callback", error: boom });
  });

  it.each(["fetch", "xhr"] as const)("성공 응답의 JSON 파싱 실패는 %s 에서 parse 오류로 reject 한다", async mode => {
    mockXHR(200, "<html>");
    global.fetch = jest.fn().mockResolvedValue(fetchResponse(200, "<html>"));
    await expect(transports[mode]().request("/api", "GET", { responseType: "json" }))
      .rejects.toMatchObject({ type: "parse", status: 200, responseText: "<html>" });
  });

  it.each(["fetch", "xhr"] as const)("HTTP 오류 응답이 JSON 이 아니어도 %s 에서 http 오류를 유지한다", async mode => {
    mockXHR(500, "Server Error");
    global.fetch = jest.fn().mockResolvedValue(fetchResponse(500, "Server Error"));
    await expect(transports[mode]().request("/api", "GET", { responseType: "json" }))
      .rejects.toMatchObject({ type: "http", status: 500 });
  });

  it.each(["fetch", "xhr"] as const)("빈 본문(204)은 %s 에서 null 로 성공한다", async mode => {
    mockXHR(204, "");
    global.fetch = jest.fn().mockResolvedValue(fetchResponse(204, ""));
    await expect(transports[mode]().request("/api", "GET", { responseType: "json" })).resolves.toMatchObject({ data: null });
  });

  it("Fetch 는 Content-Type 철자(대소문자)와 관계없이 urlencoded 를 인식한다", async () => {
    global.fetch = jest.fn().mockResolvedValue(fetchResponse(200, "{}"));
    await new FetchAjax({}).request("/api", "POST", { headers: { "CONTENT-TYPE": "application/x-www-form-urlencoded" }, data: { a: 1 } });
    const init = (global.fetch as jest.Mock).mock.calls[0][1];
    expect(init.body).toBe("a=1");
    expect(Object.keys(init.headers).filter(k => k.toLowerCase() === "content-type")).toEqual(["CONTENT-TYPE"]);
  });

  it("0, false 헤더 값은 보낸다", async () => {
    global.fetch = jest.fn().mockResolvedValue(fetchResponse(200, "{}"));
    await new FetchAjax({}).request("/api", "GET", { headers: { "X-Count": 0, "X-Flag": false } });
    expect((global.fetch as jest.Mock).mock.calls[0][1].headers).toMatchObject({ "X-Count": "0", "X-Flag": "false" });
  });

  it("동기 XHR 은 timeout 을 설정하지 않는다", async () => {
    mockXHR(200, "{}");
    const set = jest.fn();
    const desc = Object.getOwnPropertyDescriptor(XMLHttpRequest.prototype, "timeout")!;
    Object.defineProperty(XMLHttpRequest.prototype, "timeout", { configurable: true, get: desc.get, set });
    try {
      await new XHRAjax({}).request("/api", "GET", { async: false, timeout: 1000 });
      expect(set).not.toHaveBeenCalled();
    } finally {
      Object.defineProperty(XMLHttpRequest.prototype, "timeout", desc);
    }
  });

  it("동기 XHR 과 binary responseType 조합은 TypeError", async () => {
    mockXHR(200, "");
    await expect(new XHRAjax({}).request("/api", "GET", { async: false, responseType: "blob" })).rejects.toThrow(TypeError);
  });

  it("Fetch 는 blob/arraybuffer 를 data 로 반환한다", async () => {
    const blob = new Blob(["x"]);
    const buffer = new ArrayBuffer(2);
    global.fetch = jest.fn().mockResolvedValue({ ...fetchResponse(200, "ignored"), blob: async () => blob, arrayBuffer: async () => buffer });
    await expect(new FetchAjax({}).request("/api", "GET", { responseType: "blob" })).resolves.toMatchObject({ data: blob, responseText: "" });
    await expect(new FetchAjax({}).request("/api", "GET", { responseType: "arraybuffer" })).resolves.toMatchObject({ data: buffer, responseText: "" });
  });

  it("XHR 은 binary 응답을 xhr.response 로 반환하고 오류 본문은 디코드해 보존한다", async () => {
    jest.spyOn(XMLHttpRequest.prototype, "open").mockImplementation(() => {});
    jest.spyOn(XMLHttpRequest.prototype, "getAllResponseHeaders").mockReturnValue("");
    const payload = new ArrayBuffer(4);
    const errorBody = "{\"message\":\"denied\"}";
    let status = 200;
    let body: unknown = payload;
    jest.spyOn(XMLHttpRequest.prototype, "send").mockImplementation(function (this: XMLHttpRequest) {
      Object.defineProperties(this, {
        readyState: { value: 4 }, status: { value: status }, response: { get: () => body },
        responseText: { get() { throw new DOMException("InvalidStateError"); } },
      });
      this.onreadystatechange!(new Event("readystatechange"));
    });
    await expect(new XHRAjax({}).request("/api", "GET", { responseType: "arraybuffer" })).resolves.toMatchObject({ data: payload, responseText: "" });
    status = 500;
    // jsdom 환경에는 TextEncoder/TextDecoder 가 없으므로 Node 구현을 연결한다
    const { TextEncoder: NodeEncoder, TextDecoder: NodeDecoder } = require("util");
    (global as any).TextDecoder = NodeDecoder;
    body = new NodeEncoder().encode(errorBody).buffer;
    await expect(new XHRAjax({}).request("/api", "GET", { responseType: "arraybuffer" })).rejects.toMatchObject({ type: "http", status: 500, responseText: errorBody, response: { data: errorBody } });
    body = new Blob([errorBody]);
    await expect(new XHRAjax({}).request("/api", "GET", { responseType: "blob" })).rejects.toMatchObject({ type: "http", status: 500, responseText: errorBody });
    body = null;
    await expect(new XHRAjax({}).request("/api", "GET", { responseType: "blob" })).rejects.toMatchObject({ type: "http", responseText: "" });
  });

  it("요청 signal 과 전역 signal 중 하나만 취소돼도 요청이 취소된다", async () => {
    global.fetch = jest.fn((_url: any, init: any) => new Promise((_, reject) => {
      init.signal.addEventListener("abort", () => reject(Object.assign(new Error("aborted"), { name: "AbortError" })));
    })) as any;
    const globalController = new AbortController();
    const requestController = new AbortController();
    const ajax = new Ajax({ fetchMode: "fetch", signal: globalController.signal });
    const request = ajax.get("/api", { signal: requestController.signal });
    const assertion = expect(request).rejects.toMatchObject({ type: "abort" });
    globalController.abort();
    await assertion;

    const second = new Ajax({ fetchMode: "fetch", signal: new AbortController().signal });
    const secondController = new AbortController();
    const secondRequest = second.get("/api", { signal: secondController.signal });
    const secondAssertion = expect(secondRequest).rejects.toMatchObject({ type: "abort" });
    secondController.abort();
    await secondAssertion;
  });

  it.each(["fetch", "xhr"] as const)("철자만 다른 헤더는 %s 에서 나중 값 하나만 보낸다", async mode => {
    const xhrHeaders = mockXHR(200, "{}");
    global.fetch = jest.fn().mockResolvedValue(fetchResponse(200, "{}"));
    await transports[mode]().request("/api", "POST", { headers: { "Content-Type": "application/json", "content-type": "text/plain", "X-A": "1", "x-a": null }, data: "a" });
    const sent = mode === "fetch" ? (global.fetch as jest.Mock).mock.calls[0][1].headers : xhrHeaders;
    expect(Object.keys(sent).filter(k => k.toLowerCase() === "content-type")).toEqual(["content-type"]);
    expect(sent["content-type"]).toBe("text/plain");
    expect(Object.keys(sent).some(k => k.toLowerCase() === "x-a")).toBe(false);
  });

  it("Ajax 전역 헤더와 요청 헤더의 철자가 달라도 중복 전송하지 않는다", async () => {
    global.fetch = jest.fn().mockResolvedValue(fetchResponse(200, "{}"));
    await new Ajax({ fetchMode: "fetch", headers: { Authorization: "global" } }).post("/api", { headers: { authorization: "request" } });
    const headers = (global.fetch as jest.Mock).mock.calls[0][1].headers;
    expect(Object.keys(headers).filter(k => k.toLowerCase() === "authorization")).toEqual(["authorization"]);
    expect(headers.authorization).toBe("request");
  });

  it("HEAD 는 GET 처럼 data 를 쿼리로 붙이고 본문을 보내지 않는다", async () => {
    global.fetch = jest.fn().mockResolvedValue(fetchResponse(200, ""));
    await new Ajax({ fetchMode: "fetch", validMethods: ["HEAD"] }).request({ url: "/api", method: "head", data: { a: 1 }, responseType: "text" });
    const [url, init] = (global.fetch as jest.Mock).mock.calls[0];
    expect(url).toBe("/api?a=1");
    expect(init.method).toBe("HEAD");
    expect(init.body).toBeUndefined();
  });

  it("XHR 도 HEAD 에 본문과 기본 Content-Type 을 보내지 않는다", async () => {
    const headers = mockXHR(200, "");
    await new XHRAjax({}).request("/api", "HEAD", { data: { a: 1 }, responseType: "text" });
    expect(XMLHttpRequest.prototype.open).toHaveBeenCalledWith("HEAD", "/api?a=1", true);
    expect(XMLHttpRequest.prototype.send).toHaveBeenCalledWith();
    expect(headers).not.toHaveProperty("Content-Type");
  });

  it.each(["fetch", "xhr"] as const)("paramsSerializer 가 ? / & 로 시작해도 %s 에서 구분자가 겹치지 않는다", async mode => {
    mockXHR(200, "{}");
    global.fetch = jest.fn().mockResolvedValue(fetchResponse(200, "{}"));
    await transports[mode]().request("/api?x=1", "GET", { params: { a: 1 }, paramsSerializer: () => "?a=1&b=2" });
    const url = mode === "fetch" ? (global.fetch as jest.Mock).mock.calls[0][0] : (XMLHttpRequest.prototype.open as jest.Mock).mock.calls[0][1];
    expect(url).toBe("/api?x=1&a=1&b=2");
  });

  it("XHR 도 본문 없는 POST 와 raw 본문에는 기본 Content-Type 을 붙이지 않는다", async () => {
    const headers = mockXHR(200, "{}");
    await new XHRAjax({}).request("/api", "POST", {});
    await new XHRAjax({}).request("/api", "POST", { data: new ArrayBuffer(2) });
    expect(headers).not.toHaveProperty("Content-Type");
    await new XHRAjax({}).request("/api", "POST", { data: { a: 1 } });
    expect(headers["Content-Type"]).toBe("application/json");
  });

  it("허용하지 않은 메서드는 type method 로 구분된다", async () => {
    await expect(new Ajax({}).request({ url: "/api", method: "PATCH" })).rejects.toMatchObject({ type: "method", status: 405 });
  });

  it("XHR 은 정리된 헤더 기준으로 본문을 직렬화한다", async () => {
    const headers = mockXHR(200, "{}");
    await new XHRAjax({}).request("/api", "POST", { headers: { "Content-Type": "application/x-www-form-urlencoded", "content-type": null }, data: { a: 1 } });
    expect(headers["Content-Type"]).toBe("application/json");
    expect(XMLHttpRequest.prototype.send).toHaveBeenCalledWith("{\"a\":1}");
  });

  it("Fetch 는 이미 취소된 signal 이면 로더·beforeRequest·fetch 없이 abort 로 거부한다", async () => {
    global.fetch = jest.fn();
    const beforeRequest = jest.fn();
    const controller = new AbortController();
    controller.abort();
    await expect(new Ajax({ fetchMode: "fetch", enableDefaultLoader: true }).get("/api", { signal: controller.signal, beforeRequest })).rejects.toMatchObject({ type: "abort" });
    expect(global.fetch).not.toHaveBeenCalled();
    expect(beforeRequest).not.toHaveBeenCalled();
    expect(document.querySelector(".daracl-cl")).toBeNull();
  });

  it("UMD 전역에 AjaxError 를 등록한다", () => {
    (global as any).APP_VERSION = "test";
    jest.isolateModules(() => { require("../../src/global"); });
    const { AjaxError } = require("../../src/ajax/AjaxError");
    expect((window as any).Daracl.AjaxError).toBeDefined();
    expect(typeof (window as any).Daracl.AjaxError).toBe("function");
    expect(AjaxError).toBeDefined();
  });

  describe("beforeRequest 에서 옵션을 수정하면 요청에 반영된다", () => {
    const mutate = (options: any) => {
      options.headers = { ...options.headers, Authorization: "Bearer t" };
      options.params = { ...options.params, page: 2 };
      options.data = { changed: true };
    };

    it("Fetch", async () => {
      global.fetch = jest.fn().mockResolvedValue(fetchResponse(200, "{}"));
      await new FetchAjax({}).request("/api", "POST", { data: { changed: false }, beforeRequest: mutate });
      const [url, init] = (global.fetch as jest.Mock).mock.calls[0];
      expect(url).toBe("/api?page=2");
      expect(init.headers).toMatchObject({ Authorization: "Bearer t" });
      expect(init.body).toBe("{\"changed\":true}");
    });

    it("XHR", async () => {
      const headers = mockXHR(200, "{}");
      await new XHRAjax({}).request("/api", "POST", { data: { changed: false }, beforeRequest: mutate });
      expect(XMLHttpRequest.prototype.open).toHaveBeenLastCalledWith("POST", "/api?page=2", true);
      expect(headers).toMatchObject({ Authorization: "Bearer t" });
      expect(XMLHttpRequest.prototype.send).toHaveBeenCalledWith("{\"changed\":true}");
    });

    it("GET data 변경이 쿼리에 반영된다", async () => {
      global.fetch = jest.fn().mockResolvedValue(fetchResponse(200, "{}"));
      await new FetchAjax({}).request("/api", "GET", { data: { a: 1 }, beforeRequest: (o: any) => { o.data = { b: 2 }; } });
      expect((global.fetch as jest.Mock).mock.calls[0][0]).toBe("/api?b=2");
    });

    it.each(["fetch", "xhr"] as const)("opts.url 변경은 baseUrl 을 적용해 %s 에 반영된다", async mode => {
      mockXHR(200, "{}");
      global.fetch = jest.fn().mockResolvedValue(fetchResponse(200, "{}"));
      await new Ajax({ baseUrl: "/v1", fetchMode: mode }).get("/old", { beforeRequest: (o: any) => { o.url = "/new"; } });
      const url = mode === "fetch" ? (global.fetch as jest.Mock).mock.calls[0][0] : (XMLHttpRequest.prototype.open as jest.Mock).mock.calls.pop()[1];
      expect(url).toBe("/v1/new");
    });

    it("XHR 은 URL 변경으로 다시 open 해도 훅의 setRequestHeader 호출을 유지한다", async () => {
      const headers = mockXHR(200, "{}");
      await new XHRAjax({}).request("/api", "GET", { beforeRequest: (o: any, xhr: any) => { xhr.setRequestHeader("X-Hook", "1"); o.params = { p: 1 }; } });
      expect(XMLHttpRequest.prototype.open).toHaveBeenCalledTimes(2);
      expect(headers["X-Hook"]).toBe("1");
    });

    it("훅이 timeout 을 바꾸면 반영된다", async () => {
      jest.useFakeTimers();
      try {
        const spy = jest.spyOn(global, "setTimeout");
        global.fetch = jest.fn().mockResolvedValue(fetchResponse(200, "{}"));
        await new FetchAjax({}).request("/api", "GET", { timeout: -1, beforeRequest: (o: any) => { o.timeout = 1234; } });
        expect(spy).toHaveBeenCalledWith(expect.any(Function), 1234);
      } finally {
        jest.useRealTimers();
      }
    });
  });

  it.each([["onUploadProgress"], ["onDownloadProgress"]] as const)("fetchMode 가 fetch 이면 %s 는 xhr 사용을 안내하는 TypeError 로 거부한다", async name => {
    mockXHR(200, "{}");
    global.fetch = jest.fn().mockResolvedValue(fetchResponse(200, "{}"));
    const ajax = new Ajax({ fetchMode: "fetch" });
    const error = await ajax.post("/upload", { data: { a: 1 }, [name]: () => {} }).then(() => null, (e: unknown) => e);
    expect(error).toBeInstanceOf(TypeError);
    expect((error as Error).message).toContain('fetchMode: "xhr"');
    expect(global.fetch).not.toHaveBeenCalled();
    expect(XMLHttpRequest.prototype.send).not.toHaveBeenCalled();
    expect(ajax.pendingRequests.size).toBe(0);

    // 기본 fetchMode(xhr), 요청 단위 xhr, useFetch=false 는 그대로 동작한다
    await new Ajax({}).post("/upload", { data: { a: 1 }, [name]: () => {} });
    await ajax.post("/upload", { data: { a: 1 }, fetchMode: "xhr", [name]: () => {} });
    await ajax.post("/upload", { data: { a: 1 }, [name]: () => {} }, false);
    expect(XMLHttpRequest.prototype.send).toHaveBeenCalledTimes(3);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  describe("showProgress", () => {
    afterEach(() => { document.body.innerHTML = ""; });

    /** send 중에 진행 이벤트를 일으키고 그때 로더에 표시된 내용을 기록한다 */
    function mockProgressXHR(events: { upload?: [number, number, boolean?]; download?: [number, number, boolean?] }) {
      const shown: (string | undefined)[] = [];
      const read = () => document.querySelector(".daracl-cl-content")?.textContent ?? undefined;
      jest.spyOn(XMLHttpRequest.prototype, "open").mockImplementation(() => {});
      jest.spyOn(XMLHttpRequest.prototype, "setRequestHeader").mockImplementation(() => {});
      jest.spyOn(XMLHttpRequest.prototype, "getAllResponseHeaders").mockReturnValue("");
      jest.spyOn(XMLHttpRequest.prototype, "send").mockImplementation(function (this: XMLHttpRequest) {
        shown.push(read());
        const fire = (target: any, e?: [number, number, boolean?]) => {
          if (!e) return;
          target.onprogress?.({ loaded: e[0], total: e[1], lengthComputable: e[2] ?? true });
          shown.push(read());
        };
        fire(this.upload, events.upload);
        fire(this, events.download);
        Object.defineProperties(this, { readyState: { value: 4 }, status: { value: 200 }, responseText: { value: "{}" } });
        this.onreadystatechange!(new Event("readystatechange"));
      });
      return shown;
    }

    const file = () => new File(["x"], "a.txt");

    it("파일 업로드 진행률을 로더에 표시하고 사용자 콜백도 호출한다", async () => {
      const shown = mockProgressXHR({ upload: [50, 100], download: [3, 4] });
      const onUploadProgress = jest.fn();
      await new Ajax({ enableDefaultLoader: true, showProgress: true }).post("/upload", { data: { file: file() }, onUploadProgress });
      // JSON 응답(비바이너리)의 다운로드 진행률은 표시하지 않는다
      expect(shown).toEqual(["0%", "50%", "50%"]);
      expect(onUploadProgress).toHaveBeenCalledTimes(1);
      expect(document.querySelector(".daracl-cl")).toBeNull();
    });

    it("FormData 의 파일 업로드도 표시한다", async () => {
      const shown = mockProgressXHR({ upload: [1, 4] });
      const form = new FormData();
      form.append("file", file());
      await new Ajax({ enableDefaultLoader: true, showProgress: true }).post("/upload", { data: form });
      expect(shown).toEqual(["0%", "25%"]);
    });

    it("blob/arraybuffer 다운로드 진행률을 표시한다", async () => {
      const shown = mockProgressXHR({ download: [3, 4] });
      await new Ajax({ enableDefaultLoader: true, showProgress: true }).get("/file", { responseType: "blob" });
      expect(shown).toEqual(["0%", "75%"]);
    });

    it("파일 업로드와 바이너리 다운로드가 함께면 업로드 뒤 다운로드를 이어서 표시한다", async () => {
      const shown = mockProgressXHR({ upload: [100, 100], download: [10, 100] });
      await new Ajax({ enableDefaultLoader: true, showProgress: true }).post("/convert", { data: { file: file() }, responseType: "arraybuffer" });
      expect(shown).toEqual(["0%", "100%", "10%"]);
    });

    it("파일이 없는 일반 요청에는 진행률을 표시하지 않는다", async () => {
      const shown = mockProgressXHR({ upload: [50, 100], download: [3, 4] });
      await new Ajax({ enableDefaultLoader: true, showProgress: true }).post("/api", { data: { a: 1 } });
      expect(shown).toEqual([undefined, undefined, undefined]);
    });

    it("전체 크기를 모르면 진행률을 갱신하지 않는다", async () => {
      const shown = mockProgressXHR({ download: [10, 0, false] });
      await new Ajax({ enableDefaultLoader: true, showProgress: true }).get("/file", { responseType: "blob" });
      expect(shown).toEqual(["0%", "0%"]);
    });

    it("showProgress 가 없으면 진행률을 표시하지 않는다", async () => {
      const shown = mockProgressXHR({ upload: [50, 100] });
      await new Ajax({ enableDefaultLoader: true }).post("/upload", { data: { file: file() }, onUploadProgress: () => {} });
      expect(shown).toEqual([undefined, undefined]);
    });

    it("fetchMode 가 fetch 이면 진행률 표시 대상 요청은 TypeError 로 거부하고 그 외는 Fetch 로 보낸다", async () => {
      mockProgressXHR({});
      global.fetch = jest.fn().mockResolvedValue(fetchResponse(200, "{}"));
      const ajax = new Ajax({ fetchMode: "fetch", enableDefaultLoader: true, showProgress: true });
      await expect(ajax.post("/upload", { data: { file: file() } })).rejects.toThrow('fetchMode: "xhr"');
      await expect(ajax.get("/file", { responseType: "blob" })).rejects.toBeInstanceOf(TypeError);
      expect(global.fetch).not.toHaveBeenCalled();
      expect(document.querySelector(".daracl-cl")).toBeNull();
      // 일반 요청이나 로더를 쓰지 않는 요청은 Fetch 를 그대로 사용한다
      await ajax.post("/api", { data: { a: 1 } });
      await ajax.post("/upload", { data: { file: file() }, enableLoader: false });
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });
  });

  it.each(["fetch", "xhr"] as const)("typed array 본문은 %s 에서 원소를 순회하지 않고 raw 로 전송한다", async mode => {
    mockXHR(200, "{}");
    global.fetch = jest.fn().mockResolvedValue(fetchResponse(200, "{}"));
    const bytes = new Uint8Array([1, 2, 3]);
    const keys = jest.spyOn(Object, "keys");
    try {
      await transports[mode]().request("/api", "PUT", { data: bytes });
      expect(keys.mock.calls.some(([target]) => target === bytes)).toBe(false);
    } finally {
      keys.mockRestore();
    }
    if (mode === "fetch") expect((global.fetch as jest.Mock).mock.calls[0][1].body).toBe(bytes);
    else expect(XMLHttpRequest.prototype.send).toHaveBeenCalledWith(bytes);
  });

  it("typed array 와 URLSearchParams 는 파일이 아니고, 그 안의 객체 속 파일은 계속 찾는다", () => {
    const abstract = new XHRAjax({}) as any;
    expect(abstract.containsFile(new Uint8Array(10))).toBe(false);
    expect(abstract.containsFile(new URLSearchParams("a=1"))).toBe(false);
    expect(abstract.hasFileData({ list: [{ file: new File(["x"], "a.txt") }] })).toBe(true);
  });

  describe("rawBody", () => {
    const file = () => new File(["abc"], "a.png", { type: "image/png" });

    it.each(["fetch", "xhr"] as const)("File 을 %s 에서 multipart 로 감싸지 않고 그대로 보낸다", async mode => {
      const xhrHeaders = mockXHR(200, "{}");
      global.fetch = jest.fn().mockResolvedValue(fetchResponse(200, "{}"));
      const f = file();
      await transports[mode]().request("/upload", "PUT", { data: f, rawBody: true, headers: { "Content-Type": "image/png" } });
      const sent = mode === "fetch" ? (global.fetch as jest.Mock).mock.calls[0][1].body : (XMLHttpRequest.prototype.send as jest.Mock).mock.calls[0][0];
      expect(sent).toBe(f);
      const headers = mode === "fetch" ? (global.fetch as jest.Mock).mock.calls[0][1].headers : xhrHeaders;
      expect(headers["Content-Type"]).toBe("image/png");
    });

    it.each(["fetch", "xhr"] as const)("rawBody 는 %s 에서 기본 Content-Type 을 붙이지 않는다", async mode => {
      const xhrHeaders = mockXHR(200, "{}");
      global.fetch = jest.fn().mockResolvedValue(fetchResponse(200, "{}"));
      await transports[mode]().request("/upload", "PUT", { data: file(), rawBody: true });
      const headers = mode === "fetch" ? (global.fetch as jest.Mock).mock.calls[0][1].headers : xhrHeaders;
      expect(Object.keys(headers).some(k => k.toLowerCase() === "content-type")).toBe(false);
    });

    it.each(["fetch", "xhr"] as const)("ArrayBuffer·문자열도 %s 에서 가공 없이 보낸다", async mode => {
      mockXHR(200, "{}");
      global.fetch = jest.fn().mockResolvedValue(fetchResponse(200, "{}"));
      const buffer = new ArrayBuffer(4);
      await transports[mode]().request("/upload", "PUT", { data: buffer, rawBody: true });
      await transports[mode]().request("/upload", "PUT", { data: "{\"a\":1}", rawBody: true, headers: { "Content-Type": "application/json" } });
      const bodies = mode === "fetch" ? (global.fetch as jest.Mock).mock.calls.map(c => c[1].body) : (XMLHttpRequest.prototype.send as jest.Mock).mock.calls.map(c => c[0]);
      expect(bodies).toEqual([buffer, "{\"a\":1}"]);
    });

    it.each(["fetch", "xhr"] as const)("일반 객체는 %s 에서 TypeError 로 거부한다", async mode => {
      mockXHR(200, "{}");
      global.fetch = jest.fn().mockResolvedValue(fetchResponse(200, "{}"));
      await expect(transports[mode]().request("/upload", "PUT", { data: { a: 1 }, rawBody: true })).rejects.toThrow(/rawBody/);
      expect(global.fetch).not.toHaveBeenCalled();
      expect(XMLHttpRequest.prototype.send).not.toHaveBeenCalled();
    });

    it.each(["fetch", "xhr"] as const)("rawBody 에 객체를 주면 %s 모두 로더·beforeRequest 없이 같은 TypeError 로 거부한다", async mode => {
      mockXHR(200, "{}");
      global.fetch = jest.fn().mockResolvedValue(fetchResponse(200, "{}"));
      const beforeRequest = jest.fn();
      const error = await new Ajax({ fetchMode: mode, enableDefaultLoader: true }).put("/upload", { data: { a: 1 }, rawBody: true, beforeRequest }).then(() => null, (e: unknown) => e);
      expect(error).toBeInstanceOf(TypeError);
      expect(beforeRequest).not.toHaveBeenCalled();
      expect(document.querySelector(".daracl-cl")).toBeNull();
    });

    it("GET 에서는 rawBody 가 진행률 대상 판단과 Fetch 거부에 영향을 주지 않는다", async () => {
      global.fetch = jest.fn().mockResolvedValue(fetchResponse(200, "{}"));
      const ajax = new Ajax({ fetchMode: "fetch", enableDefaultLoader: true, showProgress: true, rawBody: true });
      await expect(ajax.get("/api", { data: { a: 1 } })).resolves.toMatchObject({ status: 200 });
      expect(global.fetch).toHaveBeenCalledTimes(1);
      expect(document.querySelector(".daracl-cl")).toBeNull();
    });

    it.each(["fetch", "xhr"] as const)("rawBody 가 없으면 단일 File 은 %s 에서 file 필드의 multipart(FormData)로 보낸다", async mode => {
      mockXHR(200, "{}");
      global.fetch = jest.fn().mockResolvedValue(fetchResponse(200, "{}"));
      const single = file();
      await transports[mode]().request("/upload", "PUT", { data: single });
      const body = mode === "fetch" ? (global.fetch as jest.Mock).mock.calls[0][1].body : (XMLHttpRequest.prototype.send as jest.Mock).mock.calls[0][0];
      expect(body).toBeInstanceOf(FormData);
      // 파일이 FormData 에 실제로 담겨야 한다(빈 FormData 로 파일이 사라지면 안 된다)
      expect(body.get("file")).toBe(single);
      expect(Array.from(body.keys())).toEqual(["file"]);
    });

    it("단일 Blob 도 file 필드로 보낸다", async () => {
      global.fetch = jest.fn().mockResolvedValue(fetchResponse(200, "{}"));
      const blob = new Blob(["abc"], { type: "text/plain" });
      await new FetchAjax({}).request("/upload", "POST", { data: blob });
      const sent = (global.fetch as jest.Mock).mock.calls[0][1].body.get("file");
      expect(sent).toBeInstanceOf(Blob);
      expect(sent.size).toBe(3);
    });

    it("GET 에서는 rawBody 를 무시한다", async () => {
      global.fetch = jest.fn().mockResolvedValue(fetchResponse(200, "{}"));
      await new FetchAjax({}).request("/api", "GET", { data: { a: 1 }, rawBody: true });
      expect((global.fetch as jest.Mock).mock.calls[0][0]).toBe("/api?a=1");
    });

    it("전역 rawBody 옵션이 Ajax 요청에 전달된다", async () => {
      global.fetch = jest.fn().mockResolvedValue(fetchResponse(200, "{}"));
      const f = file();
      await new Ajax({ fetchMode: "fetch", rawBody: true }).put("/upload", { data: f, headers: { "X-Client-Type": null } });
      const init = (global.fetch as jest.Mock).mock.calls[0][1];
      expect(init.body).toBe(f);
      expect(init.headers).not.toHaveProperty("X-Client-Type");
    });

    it("rawBody 업로드에도 showProgress 가 적용된다 (ArrayBuffer 포함)", async () => {
      const shown: (string | undefined)[] = [];
      jest.spyOn(XMLHttpRequest.prototype, "open").mockImplementation(() => {});
      jest.spyOn(XMLHttpRequest.prototype, "setRequestHeader").mockImplementation(() => {});
      jest.spyOn(XMLHttpRequest.prototype, "getAllResponseHeaders").mockReturnValue("");
      jest.spyOn(XMLHttpRequest.prototype, "send").mockImplementation(function (this: XMLHttpRequest) {
        shown.push(document.querySelector(".daracl-cl-content")?.textContent ?? undefined);
        (this.upload as any).onprogress?.({ loaded: 1, total: 2, lengthComputable: true });
        shown.push(document.querySelector(".daracl-cl-content")?.textContent ?? undefined);
        Object.defineProperties(this, { readyState: { value: 4 }, status: { value: 200 }, responseText: { value: "{}" } });
        this.onreadystatechange!(new Event("readystatechange"));
      });
      await new Ajax({ enableDefaultLoader: true, showProgress: true }).put("/upload", { data: new ArrayBuffer(8), rawBody: true });
      expect(shown).toEqual(["0%", "50%"]);
      document.body.innerHTML = "";
    });

    it("fetchMode fetch 와 rawBody 업로드의 showProgress 는 xhr 사용 안내 TypeError 로 거부한다", async () => {
      global.fetch = jest.fn();
      const ajax = new Ajax({ fetchMode: "fetch", enableDefaultLoader: true, showProgress: true });
      await expect(ajax.put("/upload", { data: new ArrayBuffer(8), rawBody: true })).rejects.toThrow(/xhr/);
      expect(global.fetch).not.toHaveBeenCalled();
    });
  });
});
