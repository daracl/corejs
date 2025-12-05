import { setupTestEnvironment, getAjaxInstance } from "./test-setup";

setupTestEnvironment(); // beforeAll / afterAll 자동 적용

describe("Ajax delete method test", () => {
 
  it("delete method test", async () => {
    const responseBody = { message: "success" };

    const ajax = getAjaxInstance();
    const response = await ajax.delete("/api/items", { async: false });
    
    expect(response.data).toMatchObject(responseBody);
  });
});
