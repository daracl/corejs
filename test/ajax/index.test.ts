// 공통 설정 (한 번만 실행)
import { setupTestEnvironment, getAjaxInstance } from "./test-setup";
setupTestEnvironment();

// 다른 테스트 파일들 import (Jest가 자동 실행)
import "./ajax-get.test";
import "./ajax-post.test";
import "./ajax-put.test";
import "./ajax-delete.test";
import "./ajax-header.test";
import "./ajax-request.test";
import "./ajax-multiple-upload.test";

// (선택) 통합 테스트 추가
describe("Ajax Unified Tests", () => {
  it("placeholder", () => {
    expect(true).toBe(true);
  });
});