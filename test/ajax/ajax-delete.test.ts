import { setupTestEnvironment, getAjaxInstance } from "./test-setup";

setupTestEnvironment(); // beforeAll / afterAll 자동 적용

describe("Ajax DELETE Tests", () => {
 
  it("should delete item with DELETE method", async () => {
    const ajax = getAjaxInstance();
    
    // 아이템 생성
    const createRes = await ajax.post("/api/item", { data: { title: "Item to Delete" } });
    const items = await ajax.get("/api/list");
    const lastIndex = (items.data as any[]).length - 1;
    
    // 아이템 삭제
    const deleteRes = await ajax.delete(`/api/item/${lastIndex}`);
    
    expect(deleteRes.status).toBe(200);
    expect(Array.isArray(deleteRes.data)).toBe(true);
  });

  it("should return error for non-existent item in DELETE", async () => {
    const ajax = getAjaxInstance();
    try {
      await ajax.delete("/api/item/99999");
      expect(false).toBe(true);
    } catch (err: any) {
      expect(err.status).toBe(404);
    }
  });
});
