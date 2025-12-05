// tests/setup.ts
import { Ajax } from "@/ajax/Ajax";
import app from "../../api/server";

let server: any;
let ajax: Ajax;

/**
 * 서버 시작
 */
async function startServer(port = 4000) {
  return new Promise<void>((resolve) => {
    server = app.listen(port, () => {
      console.log(`Test server running on port ${port}`);
      resolve();
    });
  });
}

/**
 * 서버 종료
 */
async function stopServer() {
  return new Promise<void>((resolve) => {
    server.close(() => {
      resolve();
    });
  });
}

/**
 * Ajax 인스턴스 생성
 */
function createAjaxInstance(baseUrl = "http://localhost:4000", timeout = -1) {
  ajax = new Ajax({ baseUrl, timeout });
  return ajax;
}

/**
 * Ajax 인스턴스 가져오기
 */
function getAjaxInstance() {
  if (!ajax) throw new Error("Ajax instance not created. Call createAjaxInstance first.");
  return ajax;
}

if (typeof (global as any).setImmediate === "undefined") {
  (global as any).setImmediate = (fn: (...args: any[]) => void, ...args: any[]) => {
    return setTimeout(fn, 0, ...args);
  };
}
if (typeof (global as any).clearImmediate === "undefined") {
  (global as any).clearImmediate = (id: any) => {
    clearTimeout(id);
  };
}

/**
 * 테스트 공통 beforeAll / afterAll
 */
export function setupTestEnvironment() {
  beforeAll(async () => {
    await startServer();
    createAjaxInstance();
  });

  afterAll(async () => {
    await stopServer();
  });
}

export { getAjaxInstance };
