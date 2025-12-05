import { setupTestEnvironment, getAjaxInstance } from "./test-setup";

setupTestEnvironment(); // beforeAll / afterAll 자동 적용

describe("Ajax put method test", () => {
 
  it("put method test", async () => {
    const responseBody = { message: "success" };

    const ajax = getAjaxInstance();
    const response = await ajax.delete("/api/items", { data: {aaa:"bbb"} });
    
    expect(response.data).toMatchObject(responseBody);
  });
});
