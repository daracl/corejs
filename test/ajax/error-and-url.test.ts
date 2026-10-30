import { Ajax } from "../../src/ajax/Ajax";
import { AjaxError } from "../../src/ajax/AjaxError";
import { FetchAjax } from "../../src/ajax/FetchAjax";
import { XHRAjax } from "../../src/ajax/XHRAjax";

describe("AjaxError 와 URL 처리", () => {
  const originalFetch = global.fetch;
  afterEach(() => { global.fetch = originalFetch; jest.restoreAllMocks(); jest.useRealTimers(); });

  /** reject 된 오류를 돌려준다. 성공하면 테스트를 실패시킨다 */
  const rejection = (promise: Promise<unknown>): Promise<any> =>
    promise.then(() => { throw new Error("reject 되어야 한다"); }, (error: unknown) => error);

  const fetchResponse = (status: number, text: string, headers: Record<string, string> = {}) => ({
    status,
    statusText: status === 500 ? "Internal Server Error" : "",
    ok: status >= 200 && status < 300,
    text: async () => text,
    headers: { forEach: (cb: (value: string, key: string) => void) => Object.entries(headers).forEach(([k, v]) => cb(v, k)) },
  });

  /** XHR 를 모킹한다. 호출부가 응답/오류를 직접 일으킨다 */
  function mockXHR(handler: (xhr: XMLHttpRequest) => void) {
    jest.spyOn(XMLHttpRequest.prototype, "open").mockImplementation(() => {});
    jest.spyOn(XMLHttpRequest.prototype, "setRequestHeader").mockImplementation(() => {});
    jest.spyOn(XMLHttpRequest.prototype, "getAllResponseHeaders").mockReturnValue("content-type: application/json\r\n");
    jest.spyOn(XMLHttpRequest.prototype, "send").mockImplementation(function (this: XMLHttpRequest) { handler(this); });
  }

  function respondXHR(xhr: XMLHttpRequest, status: number, responseText: string) {
    Object.defineProperties(xhr, {
      readyState: { value: 4, configurable: true },
      status: { value: status, configurable: true },
      statusText: { value: "Internal Server Error", configurable: true },
      responseText: { value: responseText, configurable: true },
    });
    xhr.onreadystatechange!(new Event("readystatechange"));
  }

  describe("HTTP 오류", () => {
    const body = '{"header":{"resultCode":500,"messageCode":"common.error"}}';

    it("fetch: Error 이고 status/response(data, headers)와 기존 필드를 가진다", async () => {
      global.fetch = jest.fn().mockResolvedValue(fetchResponse(500, body, { "x-id": "1" }));
      const error = await rejection(new FetchAjax({}).request("/api", "GET", { responseType: "json" }));
      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(AjaxError);
      expect(error.message).toBe("Request failed with status code 500");
      expect(error).toMatchObject({ type: "http", status: 500, statusText: "Internal Server Error", responseText: body });
      expect(error.response).toEqual({
        status: 500,
        statusText: "Internal Server Error",
        data: { header: { resultCode: 500, messageCode: "common.error" } },
        headers: { "x-id": "1" },
      });
    });

    it("xhr: Error 이고 status/response(data, headers)와 기존 필드를 가진다", async () => {
      mockXHR(xhr => respondXHR(xhr, 500, body));
      const error = await rejection(new XHRAjax({}).request("/api", "GET", { responseType: "json" }));
      expect(error).toBeInstanceOf(AjaxError);
      expect(error).toMatchObject({ type: "http", status: 500, responseText: body });
      expect(error.response.data).toEqual({ header: { resultCode: 500, messageCode: "common.error" } });
      expect(error.response.headers).toEqual({ "content-type": "application/json" });
    });

    it.each(["fetch", "xhr"] as const)("%s: JSON 이 아닌 오류 본문은 response.data 가 undefined", async mode => {
      global.fetch = jest.fn().mockResolvedValue(fetchResponse(502, "<html>bad gateway</html>"));
      mockXHR(xhr => respondXHR(xhr, 502, "<html>bad gateway</html>"));
      const transport = mode === "fetch" ? new FetchAjax({}) : new XHRAjax({});
      const error = await rejection(transport.request("/api", "GET", { responseType: "json" }));
      expect(error.response.data).toBeUndefined();
      expect(error.responseText).toBe("<html>bad gateway</html>");
    });

    it("responseType 이 json 이 아니면 response.data 는 원문 문자열", async () => {
      global.fetch = jest.fn().mockResolvedValue(fetchResponse(500, "plain"));
      const error = await rejection(new FetchAjax({}).request("/api", "GET", {}));
      expect(error.response.data).toBe("plain");
    });
  });

  describe("타임아웃과 네트워크 오류", () => {
    it("fetch 네트워크 오류는 원래 오류의 message 를 쓴다", async () => {
      global.fetch = jest.fn().mockRejectedValue(new TypeError("Failed to fetch"));
      const error = await rejection(new FetchAjax({}).request("/api", "GET", {}));
      expect(error).toBeInstanceOf(AjaxError);
      expect(error).toMatchObject({ type: "network", status: 0, message: "Failed to fetch" });
      expect(error.response).toBeUndefined();
    });

    it("xhr 네트워크 오류는 기본 문구를 쓴다", async () => {
      mockXHR(xhr => xhr.onerror!(new ProgressEvent("error")));
      const error = await rejection(new XHRAjax({}).request("/api", "GET", {}));
      expect(error).toMatchObject({ type: "network", message: "Network Error" });
    });

    it("xhr 타임아웃은 시간을 포함한 문구를 쓴다", async () => {
      mockXHR(xhr => xhr.ontimeout!(new ProgressEvent("timeout")));
      const error = await rejection(new XHRAjax({}).request("/api", "GET", { timeout: 3000 }));
      expect(error).toMatchObject({ type: "timeout", message: "timeout of 3000ms exceeded" });
    });

    it("fetch 타임아웃은 시간을 포함한 문구를 쓴다", async () => {
      jest.useFakeTimers();
      global.fetch = jest.fn((_url, init) => new Promise((_resolve, reject) => {
        init!.signal!.addEventListener("abort", () => reject(Object.assign(new Error("aborted"), { name: "AbortError" })));
      })) as any;
      const promise = new FetchAjax({}).request("/api", "GET", { timeout: 100 });
      const assertion = expect(promise).rejects.toMatchObject({ type: "timeout", message: "timeout of 100ms exceeded" });
      await Promise.resolve();
      jest.advanceTimersByTime(100);
      await assertion;
    });
  });

  it("허용하지 않는 메서드는 AjaxError(405)로 거부한다", async () => {
    const error = await rejection(new Ajax({}).request({ method: "INVALID", url: "/api" }));
    expect(error).toBeInstanceOf(AjaxError);
    expect(error).toMatchObject({ type: "method", status: 405, statusText: "Invalid Method", message: "Invalid HTTP method: INVALID" });
  });

  describe("baseUrl 결합", () => {
    const requestedUrl = async (baseUrl: string, url: string) => {
      global.fetch = jest.fn().mockResolvedValue(fetchResponse(200, "{}"));
      await new Ajax({ baseUrl, fetchMode: "fetch" }).get(url);
      return (global.fetch as jest.Mock).mock.calls[0][0];
    };

    it.each([
      ["/api", "users", "/api/users"],
      ["/api/", "users", "/api/users"],
      ["/api", "/users", "/api/users"],
      ["/api/", "/users", "/api/users"],
      ["/api", "http://other.test/users", "http://other.test/users"],
      ["/api", "//other.test/users", "//other.test/users"],
      ["/api", "?a=1", "/api?a=1"],
    ])("baseUrl=%s url=%s → %s", async (baseUrl, url, expected) => {
      expect(await requestedUrl(baseUrl, url)).toBe(expected);
    });
  });

  describe("params", () => {
    it("null 과 undefined 는 쿼리에 넣지 않는다", async () => {
      global.fetch = jest.fn().mockResolvedValue(fetchResponse(200, "{}"));
      await new Ajax({ fetchMode: "fetch" }).get("/api", { params: { a: "1", b: null, c: undefined, d: 0, e: false } });
      expect((global.fetch as jest.Mock).mock.calls[0][0]).toBe("/api?a=1&d=0&e=false");
    });

    it.each(["fetch", "xhr"] as const)("%s: paramsSerializer 가 있으면 그것으로 직렬화한다", async mode => {
      global.fetch = jest.fn().mockResolvedValue(fetchResponse(200, "{}"));
      mockXHR(xhr => respondXHR(xhr, 200, "{}"));
      const paramsSerializer = jest.fn((params: Record<string, unknown>) => `ids=${(params.ids as string[]).join(",")}`);
      await new Ajax({ fetchMode: mode, paramsSerializer }).get("/api", { params: { ids: ["a", "b"] } });
      expect(paramsSerializer).toHaveBeenCalledWith({ ids: ["a", "b"] });
      if (mode === "fetch") expect((global.fetch as jest.Mock).mock.calls[0][0]).toBe("/api?ids=a,b");
      else expect(XMLHttpRequest.prototype.open).toHaveBeenCalledWith("GET", "/api?ids=a,b", true);
    });

    it("호출별 paramsSerializer 가 인스턴스 기본값보다 우선한다", async () => {
      global.fetch = jest.fn().mockResolvedValue(fetchResponse(200, "{}"));
      await new Ajax({ fetchMode: "fetch", paramsSerializer: () => "from=global" })
        .get("/api", { params: { x: 1 }, paramsSerializer: () => "from=call" });
      expect((global.fetch as jest.Mock).mock.calls[0][0]).toBe("/api?from=call");
    });
  });
});
