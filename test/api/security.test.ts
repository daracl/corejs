/** @jest-environment node */
import { mkdirSync, mkdtempSync, readdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import type { Server } from "node:http";

mkdirSync(join(process.cwd(), "test-results"), { recursive: true });
const uploadDir = mkdtempSync(join(process.cwd(), "test-results", "api-security-"));
const previousUploadDir = process.env.DARACL_UPLOAD_DIR;
process.env.DARACL_UPLOAD_DIR = uploadDir;
const app = require("../../api/server").default;
const request = require("supertest");
let server: Server;

beforeAll(async () => {
  await new Promise<void>(resolve => { server = app.listen(0, "127.0.0.1", resolve); });
});

afterEach(() => {
  for (const file of readdirSync(uploadDir)) rmSync(join(uploadDir, file));
});

afterAll(async () => {
  await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  rmSync(uploadDir, { recursive: true, force: true });
  if (previousUploadDir === undefined) delete process.env.DARACL_UPLOAD_DIR;
  else process.env.DARACL_UPLOAD_DIR = previousUploadDir;
});

describe("개발 API 보안 경계", () => {
  it("허용하지 않은 출처의 변경 요청을 거부한다", async () => {
    const response = await request(server).post("/api/item").set("Origin", "https://untrusted.example").send({ name: "blocked" });
    expect(response.status).toBe(403);
    expect(response.headers["access-control-allow-origin"]).toBeUndefined();
  });

  it("허용한 UI 출처의 preflight를 처리한다", async () => {
    const response = await request(server).options("/api/upload").set("Origin", "http://127.0.0.1:4171")
      .set("Access-Control-Request-Method", "POST");
    expect(response.status).toBe(204);
    expect(response.headers["access-control-allow-origin"]).toBe("http://127.0.0.1:4171");
  });

  it("요청 헤더로 CORS 응답 정책을 덮어쓸 수 없다", async () => {
    const response = await request(server).get("/api/list").set("Origin", "http://localhost:4171")
      .set("Access-Control-Allow-Origin", "*");
    expect(response.status).toBe(200);
    expect(response.headers["access-control-allow-origin"]).toBe("http://localhost:4171");
  });

  it("제한 내 업로드는 저장하고 내려받을 수 있다", async () => {
    const response = await request(server).post("/api/upload").field("name", "fixture")
      .attach("file", Buffer.from("safe fixture"), "fixture.txt");
    expect(response.status).toBe(201);
    expect(response.body.name).toBe("fixture");
    expect(response.body.file.size).toBe(12);
    const downloaded = await request(server).get(response.body.filePath);
    expect(downloaded.status).toBe(200);
    expect(downloaded.text).toBe("safe fixture");
  });

  it("10MB 초과 파일을 거부하고 임시 파일을 제거한다", async () => {
    const response = await request(server).post("/api/upload").attach("file", Buffer.alloc(10 * 1024 * 1024 + 1), "large.bin");
    expect(response.status).toBe(413);
    expect(response.body.error).toBe("LIMIT_FILE_SIZE");
    expect(readdirSync(uploadDir)).toEqual([]);
  });

  it("최대 파일 수를 초과하면 모든 업로드 파일을 제거한다", async () => {
    let pending = request(server).post("/api/upload-multiple");
    for (let i = 0; i < 11; i++) pending = pending.attach("files", Buffer.from("file"), `${i}.txt`);
    const response = await pending;
    expect(response.status).toBe(413);
    expect(response.body.error).toBe("LIMIT_FILE_COUNT");
    expect(readdirSync(uploadDir)).toEqual([]);
  });

  it("필드 수와 필드 크기 제한을 적용한다", async () => {
    let pending = request(server).post("/api/upload");
    for (let i = 0; i < 51; i++) pending = pending.field(`field${i}`, "value");
    expect((await pending).body.error).toBe("LIMIT_FIELD_COUNT");
    const response = await request(server).post("/api/upload").field("large", "x".repeat(64 * 1024 + 1));
    expect(response.status).toBe(413);
    expect(response.body.error).toBe("LIMIT_FIELD_VALUE");
  });

  it("예상하지 않은 파일 필드와 잘못된 JSON을 JSON 오류로 반환한다", async () => {
    const upload = await request(server).post("/api/upload").attach("unexpected", Buffer.from("file"), "fixture.txt");
    expect(upload.status).toBe(400);
    expect(upload.body.error).toBe("LIMIT_UNEXPECTED_FILE");
    const json = await request(server).post("/api/item").type("json").send("{invalid");
    expect(json.status).toBe(400);
    expect(json.body).toEqual({ error: "Invalid request" });
  });
});
