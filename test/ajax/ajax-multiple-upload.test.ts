import { setupTestEnvironment, getAjaxInstance } from "./test-setup";

setupTestEnvironment(); // beforeAll / afterAll 자동 적용

describe("Ajax Multiple File Upload Tests", () => {

  it("should upload multiple files via /api/upload-multiple", async () => {
    const ajax = getAjaxInstance();

    const form = new FormData();
    form.append("name", "Multi File Test");
    form.append("description", "Testing multiple file upload");

    // Create 3 test files
    const file1 = new File(["content of file 1"], "file1.txt", { type: "text/plain" });
    const file2 = new File(["content of file 2"], "file2.txt", { type: "text/plain" });
    const file3 = new File(["content of file 3"], "file3.json", { type: "application/json" });

    form.append("files", file1);
    form.append("files", file2);
    form.append("files", file3);

    const res = await ajax.post("/api/upload-multiple", { data: form });

    expect(res.status).toBe(201);
    expect(res.data.files).toBeDefined();
    expect(Array.isArray(res.data.files)).toBe(true);
    expect(res.data.files.length).toBe(3);
    expect(res.data.filesCount).toBe(3);
    expect(res.data.totalSize).toBeGreaterThan(0);

    // Verify file info
    expect(res.data.files[0].originalName).toBe("file1.txt");
    expect(res.data.files[1].originalName).toBe("file2.txt");
    expect(res.data.files[2].originalName).toBe("file3.json");

    // Verify form fields
    expect(res.data.name).toBe("Multi File Test");
    expect(res.data.description).toBe("Testing multiple file upload");
  });

  it("should upload multiple files to /api/item-multiple", async () => {
    const ajax = getAjaxInstance();

    const form = new FormData();
    form.append("title", "Item with Multiple Files");
    form.append("category", "documents");

    const file1 = new File(["doc 1 content"], "document1.txt", { type: "text/plain" });
    const file2 = new File(["doc 2 content"], "document2.txt", { type: "text/plain" });

    form.append("files", file1);
    form.append("files", file2);

    const res = await ajax.post("/api/item-multiple", { data: form });

    expect(res.status).toBe(201);
    expect(res.data.files).toBeDefined();
    expect(res.data.files.length).toBe(2);
    expect(res.data.filesCount).toBe(2);
    expect(res.data.title).toBe("Item with Multiple Files");
  });

  it("should track upload progress for multiple files", async () => {
    const ajax = getAjaxInstance();
    let uploadProgressCalled = false;

    const form = new FormData();
    form.append("batch", "progress test");

    // Create larger files to ensure progress events
    const bigFile1 = new File(["x".repeat(1024 * 50)], "large1.bin", { type: "application/octet-stream" });
    const bigFile2 = new File(["y".repeat(1024 * 50)], "large2.bin", { type: "application/octet-stream" });

    form.append("files", bigFile1);
    form.append("files", bigFile2);

    const res = await ajax.post("/api/upload-multiple", {
      data: form,
      onUploadProgress: (event: any) => {
        uploadProgressCalled = true;
      },
    });

    expect(res.status).toBe(201);
    expect(uploadProgressCalled).toBe(true);
    expect(res.data.files.length).toBe(2);
  }, 15000);

  it("should handle error when no files are provided", async () => {
    const ajax = getAjaxInstance();

    const form = new FormData();
    form.append("name", "No files");

    try {
      await ajax.post("/api/upload-multiple", { data: form });
      expect(false).toBe(true);
    } catch (err: any) {
      expect(err.status).toBe(400);
      expect(err.type).toBe("http");
    }
  });

  it("should handle empty file upload", async () => {
    const ajax = getAjaxInstance();

    const form = new FormData();
    form.append("description", "Empty file test");
    const emptyFile = new File([], "empty.txt", { type: "text/plain" });
    form.append("files", emptyFile);

    const res = await ajax.post("/api/upload-multiple", { data: form });

    expect(res.status).toBe(201);
    expect(res.data.files.length).toBe(1);
    expect(res.data.files[0].size).toBe(0);
  });

  it("should upload files with special characters in names", async () => {
    const ajax = getAjaxInstance();

    const form = new FormData();
    form.append("project", "special chars test");

    const file1 = new File(["content"], "파일1_한글.txt", { type: "text/plain" });
    const file2 = new File(["content"], "file-2-with-dashes.txt", { type: "text/plain" });
    const file3 = new File(["content"], "file_3_with@special#chars.txt", { type: "text/plain" });

    form.append("files", file1);
    form.append("files", file2);
    form.append("files", file3);

    const res = await ajax.post("/api/upload-multiple", { data: form });

    expect(res.status).toBe(201);
    expect(res.data.files.length).toBe(3);
    // Files are renamed by server, so check they exist
    expect(res.data.files.every((f: any) => f.fileName)).toBe(true);
  });

  it("should upload mixed file types", async () => {
    const ajax = getAjaxInstance();

    const form = new FormData();
    form.append("batch", "mixed types");

    const textFile = new File(["text content"], "document.txt", { type: "text/plain" });
    const jsonFile = new File(['{"key":"value"}'], "data.json", { type: "application/json" });
    const binaryFile = new File([new Uint8Array([0, 1, 2, 3])], "binary.bin", { type: "application/octet-stream" });

    form.append("files", textFile);
    form.append("files", jsonFile);
    form.append("files", binaryFile);

    const res = await ajax.post("/api/upload-multiple", { data: form });

    expect(res.status).toBe(201);
    expect(res.data.files.length).toBe(3);
    expect(res.data.files[0].mimeType).toBe("text/plain");
    expect(res.data.files[1].mimeType).toBe("application/json");
  });
});
