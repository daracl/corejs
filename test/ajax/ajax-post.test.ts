import { setupTestEnvironment, getAjaxInstance } from "./test-setup";

setupTestEnvironment(); // beforeAll / afterAll 자동 적용

describe("Ajax POST Tests", () => {

  it("should POST JSON data and return posted data", async () => {
    const ajax = getAjaxInstance();
    const payload = { title: "Test Item", description: "Test Description" };
    const res = await ajax.post("/api/item", { data: payload });
    
    expect(res.status).toBe(201);
    expect(res.data).toEqual(payload);
  });

  it("should handle POST with empty body", async () => {
    const ajax = getAjaxInstance();
    const res = await ajax.post("/api/item", { data: {} });
    
    expect(res.status).toBe(201);
    expect(res.data).toBeDefined();
  });

  it("should upload file via FormData", async () => {
    const ajax = getAjaxInstance();

    // FormData에 텍스트 필드와 파일(Blob/File) 추가
    const form = new FormData();
    form.append("title", "File Upload Test");
    const file = new File(["hello world content"], "test.txt", { type: "text/plain" });
    form.append("file", file);

    const res = await ajax.post("/api/item", { data: form });

    expect(res.status).toBeGreaterThanOrEqual(200);
    expect(res.status).toBeLessThan(300);
    expect(res.data.file).toBeDefined();
    expect(res.data.file.originalName).toBe("test.txt");
  });

  it("should track upload progress", async () => {
    const ajax = getAjaxInstance();
    let uploadProgressCalled = false;

    const form = new FormData();
    form.append("name", "Progress Test");
    const bigFile = new File(["x".repeat(1024 * 100)], "large.bin", { type: "application/octet-stream" });
    form.append("file", bigFile);

    const res = await ajax.post("/api/item", {
      data: form,
      onUploadProgress: (event: any) => {
        uploadProgressCalled = true;
      },
    });

    expect(res.status).toBeGreaterThanOrEqual(200);
    expect(uploadProgressCalled).toBe(true);
  }, 15000);

  it("should set custom headers for POST", async () => {
    const ajax = getAjaxInstance();
    const payload = { test: "data" };
    
    const res = await ajax.post("/api/item", {
      data: payload,
      headers: { "X-Custom-Header": "test-value" },
    });

    expect(res.status).toBe(201);
  });

  it("should handle POST error response", async () => {
    const ajax = getAjaxInstance();
    try {
      await ajax.post("/api/item/999", { data: { test: "data" } });
      expect(false).toBe(true);
    } catch (err: any) {
      expect(err.status).toBe(404);
    }
  });
});
