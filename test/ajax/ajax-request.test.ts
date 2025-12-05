import { setupTestEnvironment, getAjaxInstance } from "./test-setup";

setupTestEnvironment(); // beforeAll / afterAll 자동 적용

describe("Ajax request test", () => {
 
  it("request test", async () => {
    const responseBody = { message: "success" };

    const ajax = getAjaxInstance();
    const response = await ajax.request({url : "/api/items", data: {aaa:"bbb"} });
    
  });
});
