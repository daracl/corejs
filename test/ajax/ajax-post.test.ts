import { setupTestEnvironment, getAjaxInstance } from "./test-setup";

setupTestEnvironment(); // beforeAll / afterAll 자동 적용

describe("Ajax POST /api/items", () => {
  it("should return posted data", async () => {
    const ajax = getAjaxInstance();
    const payload = { aaa: "bbbb" };
    const res = await ajax.post("/api/items", { data: payload });
    expect(res.data).toEqual(payload);
  });

  it("should return 404 for invalid endpoint", async () => {
    const ajax = getAjaxInstance();
    try {
      await ajax.post("/api/items1", { data: { aaa: "bbbb" } });
    } catch (err: any) {
      console.log(err.xhr.status);
      expect(err.xhr.status).toBe(404);
    }
  });
});
