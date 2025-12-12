import { setupTestEnvironment, getAjaxInstance } from "./test-setup";

setupTestEnvironment(); // beforeAll / afterAll 자동 적용

describe("Ajax PUT Tests", () => {
 
  it("should update item with PUT method", async () => {
    const ajax = getAjaxInstance();
    const updatePayload = { title: "Updated Title", description: "Updated Description" };
    
    // 아이템 생성 후 업데이트
    const createRes = await ajax.post("/api/item", { data: { title: "Original" } });
    // 서버에서 아이템이 배열에 저장되므로, 마지막 인덱스로 업데이트
    const items = await ajax.get("/api/list");
    const lastIndex = (items.data as any[]).length - 1;
    
    const updateRes = await ajax.put(`/api/item/${lastIndex}`, { data: updatePayload });
    
    expect(updateRes.status).toBe(200);
    expect(updateRes.data).toEqual(updatePayload);
  });

  it("should return error for non-existent item in PUT", async () => {
    const ajax = getAjaxInstance();
    try {
      await ajax.put("/api/item/99999", { data: { title: "test" } });
      expect(false).toBe(true);
    } catch (err: any) {
      expect(err.status).toBe(404);
    }
  });
});
