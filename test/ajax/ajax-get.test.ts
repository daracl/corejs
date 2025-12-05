import { setupTestEnvironment, getAjaxInstance } from "./test-setup";

setupTestEnvironment(); // beforeAll / afterAll 자동 적용

describe("Ajax GET /api/list", () => {
  it("should return data array", async () => {
    const ajax = getAjaxInstance();
    
    const res = await ajax.get("/api/list");

    expect(res.data).toBeDefined();
    expect(Array.isArray(res.data)).toBe(true);
  });

  it("should return 404 for invalid endpoint", async () => {
    const ajax = getAjaxInstance();
    try {
      await ajax.get("/api/list1");
    } catch (err: any) {
      //console.log(err);
      expect(err.xhr.status).toBe(404);
    }
  });
});