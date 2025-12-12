import { setupTestEnvironment, getAjaxInstance } from "./test-setup";

setupTestEnvironment(); // beforeAll / afterAll 자동 적용

describe("Ajax request test", () => {
 
  it("request test", async () => {
    const responseBody = { message: "success" };

    const ajax = getAjaxInstance();
    const res = await ajax.request({url : "/api/list", method:"get", data: {aaa:"bbb"} });

    expect(Array.isArray(res.data)).toBe(true);
    expect(res.status).toBe(200);
    
  });
});
