// tests/setup.ts
import { Ajax } from "@/ajax/Ajax";
import app from "../../api/server";

// Node 18+ built-in fetch 사용 (undici 기반)
// 추가 polyfill 불필요

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

// 싱글턴: setupTestEnvironment가 한 번만 등록되도록 관리
let isSetupDone = false;

/**
 * 테스트 공통 beforeAll / afterAll
 * 여러 번 호출되어도 한 번만 실행 (싱글턴 패턴)
 */
export function setupTestEnvironment() {
  if (isSetupDone) {
    return; // 이미 등록됨, 중복 등록 방지
  }
  isSetupDone = true;

  beforeAll(async () => {
    await startServer();
    createAjaxInstance();
  });

  afterAll(async () => {
    await stopServer();
  });
}

export { getAjaxInstance };
