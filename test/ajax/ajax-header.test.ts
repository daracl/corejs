import { setupTestEnvironment, getAjaxInstance } from "./test-setup";

setupTestEnvironment();

describe("Ajax GET /api/items - Header Test", () => {
  it("should send custom headers", async () => {
    const ajax = getAjaxInstance();

    const customHeaders = {
      "X-Custom-Header": "my-header-value",
      "Authorization": "Bearer 12345",
    };

    const res = await ajax.get("/api/items", { headers: customHeaders });

    console.log('res.headers : ', res);

    expect(res.headers).toBeDefined();
    expect(res.headers["x-custom-header"]).toBe("my-header-value");
    expect(res.headers["authorization"]).toBe("Bearer 12345");

    console.log("Response headers:", res.headers);
  });
});
