/** @jest-environment node */
import { mkdirSync, mkdtempSync, readdirSync, rmSync, utimesSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { Server } from "node:http";

mkdirSync(join(process.cwd(), "test-results"), { recursive: true });
const uploadDir = mkdtempSync(join(process.cwd(), "test-results", "api-dev-"));
const previousUploadDir = process.env.DARACL_UPLOAD_DIR;
process.env.DARACL_UPLOAD_DIR = uploadDir;
const serverModule = require("../../api/server");
const app = serverModule.default;
const request = require("supertest");
let server: Server;

beforeAll(async () => {
  await new Promise<void>(resolve => { server = app.listen(0, "127.0.0.1", resolve); });
});

afterAll(async () => {
  await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  rmSync(uploadDir, { recursive: true, force: true });
  if (previousUploadDir === undefined) delete process.env.DARACL_UPLOAD_DIR;
  else process.env.DARACL_UPLOAD_DIR = previousUploadDir;
});

describe("개발 API 입력 검증", () => {
  it("PUT/DELETE 는 0 이상의 정수 인덱스만 허용한다", async () => {
    for (const index of ["1abc", "-1", "1.5", "abc"]) {
      expect((await request(server).put(`/api/item/${index}`).send({ a: 1 })).status).toBe(404);
      expect((await request(server).delete(`/api/item/${index}`)).status).toBe(404);
    }
    expect((await request(server).put("/api/item/9999").send({ a: 1 })).status).toBe(404);
  });

  it("본문이 JSON 객체가 아니면 400 으로 거부하고 기존 항목은 유지한다", async () => {
    const before = (await request(server).get("/api/list")).body;
    expect((await request(server).put("/api/item/0").send([1, 2])).status).toBe(400);
    expect((await request(server).put("/api/item/0").set("Content-Type", "application/json").send("null")).status).toBe(400);
    expect((await request(server).post("/api/item").send([1])).status).toBe(400);
    expect((await request(server).get("/api/list")).body).toEqual(before);
  });

  it("객체 본문은 기존처럼 수정·삭제할 수 있다", async () => {
    const created = await request(server).post("/api/item").send({ name: "temp" });
    expect(created.status).toBe(201);
    const list = (await request(server).get("/api/list")).body;
    const index = list.findIndex((item: { name?: string }) => item.name === "temp");
    expect((await request(server).put(`/api/item/${index}`).send({ name: "changed" })).body).toEqual({ name: "changed" });
    expect((await request(server).delete(`/api/item/${index}`)).status).toBe(200);
  });

  it("저장 항목이 상한에 도달하면 507 로 거부한다", async () => {
    let status = 201;
    for (let count = 0; count < 1100 && status === 201; count++) status = (await request(server).post("/api/item").send({ n: count })).status;
    expect(status).toBe(507);
    expect((await request(server).post("/api/item-multiple").send({ n: 1 })).status).toBe(507);
    // 상한에 도달해도 읽기와 수정·삭제는 가능하다
    expect((await request(server).get("/api/list")).status).toBe(200);
    expect((await request(server).delete("/api/item/0")).status).toBe(200);
  }, 60000);
});

describe("업로드 폴더 정리", () => {
  const day = 24 * 60 * 60 * 1000;
  const uuid = (suffix: string) => `0123abcd-0123-4abc-8abc-0123456789ab${suffix}`;

  it("직접 지정한 폴더는 기본 폴더가 아니라고 표시한다", () => {
    expect(serverModule.usesDefaultUploadDir).toBe(false);
    expect(serverModule.uploadDir).toBe(uploadDir);
  });

  it("지정 시간이 지난 UUID 이름의 파일만 삭제한다", () => {
    const dir = mkdtempSync(join(uploadDir, "prune-"));
    const create = (name: string, ageMs: number) => {
      const file = join(dir, name);
      writeFileSync(file, "x");
      const time = new Date(Date.now() - ageMs);
      utimesSync(file, time, time);
    };
    create(uuid(".png"), 2 * day);
    create(uuid(""), 2 * day);
    create("0123abcd-0123-4abc-8abc-0123456789ac.txt", day / 2);
    create("notes.txt", 5 * day);
    create("0123abcd-too-short.png", 5 * day);
    mkdirSync(join(dir, uuid(".d")));
    expect(serverModule.pruneUploads(dir, day)).toBe(2);
    expect(readdirSync(dir).sort()).toEqual(["0123abcd-0123-4abc-8abc-0123456789ac.txt", "0123abcd-too-short.png", uuid(".d"), "notes.txt"].sort());
  });
});
