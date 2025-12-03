import { setupTestEnvironment, getAjaxInstance } from "./test-setup";

setupTestEnvironment(); // beforeAll / afterAll 자동 적용

describe("Ajax GET /api/items", () => {
  it("should return data array", async () => {
    const ajax = getAjaxInstance();
    const res = await ajax.get("/api/items");
    expect(res.data).toBeDefined();
    expect(Array.isArray(res.data)).toBe(true);
  });

  it("should return 404 for invalid endpoint", async () => {
    const ajax = getAjaxInstance();
    try {
      await ajax.get("/api/items1");
    } catch (err: any) {
      console.log(err.xhr.status);
      expect(err.xhr.status).toBe(404);
    }
  });
});