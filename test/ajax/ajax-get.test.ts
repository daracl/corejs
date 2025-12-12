import { setupTestEnvironment, getAjaxInstance } from "./test-setup";

setupTestEnvironment(); // beforeAll / afterAll 자동 적용

describe("Ajax GET Tests", () => {

  it("should return data array from /api/list", async () => {
    const ajax = getAjaxInstance();
    const res = await ajax.get("/api/list");

    expect(res.data).toBeDefined();
    expect(Array.isArray(res.data)).toBe(true);
    expect(res.status).toBe(200);
  });

  it("should handle 404 error for invalid endpoint", async () => {
    const ajax = getAjaxInstance();
    try {
      await ajax.get("/api/invalid-endpoint");
      expect(false).toBe(true); // 404가 발생해야 함
    } catch (err: any) {
      expect(err).toBeDefined();
      expect(err.status).toBe(404);
      expect(err.type).toBe("http");
    }
  }, 10000);

  it("should handle 500 server error", async () => {
    const ajax = getAjaxInstance();
    try {
      await ajax.get("/api/err500");
      expect(false).toBe(true);
    } catch (err: any) {
      expect(err.status).toBe(500);
      expect(err.type).toBe("http");
    }
  }, 10000);

  it("should respect timeout and return error", async () => {
    const ajax = getAjaxInstance();
    try {
      // /api/longtime은 5초 지연, 타임아웃을 1초로 설정
      await ajax.get("/api/longtime", { timeout: 1000 });
      expect(false).toBe(true);
    } catch (err: any) {
      expect(err).toBeDefined();
      expect(err.type).toBe("timeout");
    }
  }, 10000);

  it("should successfully complete long running request with sufficient timeout", async () => {
    const ajax = getAjaxInstance();
    // /api/longtime은 5초 지연, 충분한 타임아웃 제공
    const res = await ajax.get("/api/longtime", { timeout: 10000 });
    expect(res.data).toBeDefined();
    expect(res.data.message).toBe("completed");
  }, 15000);

  it("should return JSON response", async () => {
    const ajax = getAjaxInstance();
    const res = await ajax.get("/api/list", { responseType: "json" });
    expect(Array.isArray(res.data)).toBe(true);
  });

  it("should include response headers", async () => {
    const ajax = getAjaxInstance();
    const res = await ajax.get("/api/list");
    expect(res.headers).toBeDefined();
  });
});