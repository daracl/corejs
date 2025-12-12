import { setupTestEnvironment, getAjaxInstance } from "./test-setup";

setupTestEnvironment();

describe("Ajax GET /api/list - Header Test", () => {
  it("should send custom headers", async () => {
    const ajax = getAjaxInstance();

    const customHeaders = {
      "X-Custom-Header": "my-header-value",
      "Authorization": "Bearer 12345",
    };


    const res = await ajax.get("/api/header-value", { headers: customHeaders });

    expect(res.data).toBeDefined();
    expect(res.data.requestHeaders).toBeDefined();

    const requestHeaders = res.data.requestHeaders;

    // 헤더는 모두 소문자로 들어옴
    expect(requestHeaders["x-custom-header"]).toBe("my-header-value");
    expect(requestHeaders["authorization"]).toBe("Bearer 12345");

     console.log('res.headers : ', res.headers);
  });
});
