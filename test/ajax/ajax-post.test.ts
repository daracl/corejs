import { setupTestEnvironment, getAjaxInstance } from "./test-setup";

setupTestEnvironment(); // beforeAll / afterAll 자동 적용

describe("Ajax POST test", () => {

  it("should return posted data", async () => {
    const ajax = getAjaxInstance();
    const payload = { aaa: "bbbb" };
    const res = await ajax.post("/api/item", { data: payload });
    expect(res.data).toEqual(payload);
  });

  it("should return 404 for invalid endpoint", async () => {
    const ajax = getAjaxInstance();
    try {
      await ajax.post("/api/item1", { data: { aaa: "bbbb" } });
    } catch (err: any) {
      //console.log(err.xhr.status);
      expect(err.xhr.status).toBe(404);
    }
  });

  it("should upload file (FormData)", async () => {
    const ajax = getAjaxInstance();

    // FormData에 텍스트 필드와 파일(Blob/File) 추가
    const form = new FormData();
    form.append("aaa", "bbbb");
    const file = new File(["hello world"], "test.txt", { type: "text/plain" });
    form.append("file", file);

    // 테스트 서버가 FormData를 처리하도록 /api/item 또는 /api/upload 엔드포인트를 사용
    const res = await ajax.post("/api/item", { data: form });

    // 요청이 성공했는지 확인
    expect(res.status).toBeGreaterThanOrEqual(200);
    expect(res.status).toBeLessThan(300);

    // 서버가 필드/파일 정보를 에코하면 추가 검증
    expect(res.data.aaa).toBe("bbbb");
    expect(res.data.file.originalName).toBe("test.txt");
    
    
  });
});
