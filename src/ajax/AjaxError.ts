/** http: 상태 코드 오류, network/timeout/abort: 전송 오류, parse: 성공 응답의 본문 파싱 실패, callback: beforeRequest/beforeResponse 훅 예외, method: 허용되지 않은 메서드(요청을 보내지 않음, status 405) */
export type AjaxErrorType = "http" | "network" | "timeout" | "abort" | "parse" | "callback" | "method";

/** axios 의 error.response 와 같은 모양(HTTP 오류일 때만 채워진다) */
export interface AjaxErrorResponse {
  status: number;
  statusText: string;
  /** responseType 이 json 이면 파싱한 값(파싱 실패 시 undefined), 그 외에는 원문 문자열 */
  data: unknown;
  headers: Record<string, string>;
}

export interface AjaxErrorInit {
  type: AjaxErrorType;
  message?: string;
  status?: number;
  statusText?: string;
  responseText?: string;
  error?: unknown;
  xhr?: unknown;
  loadingInstance?: unknown;
  response?: AjaxErrorResponse;
}

function defaultMessage(type: AjaxErrorType, status?: number, error?: unknown): string {
  switch (type) {
    case "http":
      return `Request failed with status code ${status}`;
    case "timeout":
      return "timeout exceeded";
    case "abort":
      return "Request aborted";
    case "method":
      return "Invalid HTTP method";
    case "parse":
      return "Failed to parse response body";
    case "callback":
      return (error as { message?: string } | null | undefined)?.message || "Request callback failed";
    default:
      return (error as { message?: string } | null | undefined)?.message || "Network Error";
  }
}

/**
 * Ajax 오류.
 * 예전에 reject 하던 평범한 객체의 필드(type/status/statusText/responseText/error/xhr/loadingInstance)를 그대로 유지한다.
 */
export class AjaxError extends Error {
  readonly type: AjaxErrorType;
  readonly status: number;
  readonly statusText: string;
  readonly responseText: string;
  readonly error: unknown;
  readonly xhr: unknown;
  readonly loadingInstance: unknown;
  readonly response?: AjaxErrorResponse;

  constructor(init: AjaxErrorInit) {
    super(init.message ?? defaultMessage(init.type, init.status, init.error));
    Object.setPrototypeOf(this, AjaxError.prototype);
    this.name = "AjaxError";
    this.type = init.type;
    this.status = init.status ?? 0;
    this.statusText = init.statusText ?? "";
    this.responseText = init.responseText ?? "";
    this.error = init.error ?? null;
    this.xhr = init.xhr;
    this.loadingInstance = init.loadingInstance;
    this.response = init.response;
  }
}
