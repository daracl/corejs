import { AjaxOptions, GlobalAjaxOptions } from "../types/web/AjaxOptions";
import { isArray, isFormData, isObject, joinUrl, objectToQueryString } from "../utils";
import type { Loading } from "../Loading";
import { AjaxError, AjaxErrorResponse, AjaxErrorType } from "./AjaxError";

/**
 * Ajax 클래스
 */
export abstract class AjaxAbstract {
  protected options: GlobalAjaxOptions;

  constructor(options: GlobalAjaxOptions) {
    this.options = options;
  }

  public abstract request(url: string, method: string, opts: AjaxOptions): Promise<any>;

  // 객체 내부에 File/Blob/FileList가 있는지 재귀 검사
  protected containsFile(data: any, seen: WeakSet<object> = new WeakSet()): boolean {
    if (!data) return false;
    if (typeof File !== "undefined" && (data instanceof File || data instanceof Blob)) return true;
    if (typeof FileList !== "undefined" && data instanceof FileList) return true;
    // 파일을 담을 수 없는 바이너리·직렬화 객체는 순회하지 않는다. typed array 를 Object.keys 로 펼치면 크기에 비례해 시간·메모리를 쓴다
    if (this.isRawBody(data)) return false;
    if (typeof data === "object") {
      if (seen.has(data)) return false; // 순환 참조
      seen.add(data);
    }
    if (isArray(data)) {
      for (const item of data) {
        if (this.containsFile(item, seen)) return true;
      }
      return false;
    }
    if (isObject(data)) {
      for (const key of Object.keys(data)) {
        if (this.containsFile((data as any)[key], seen)) return true;
      }
    }
    return false;
  }

  // JSON으로 직렬화하면 안 되는 본문(URLSearchParams, ArrayBuffer, typed array)인지 검사
  protected isRawBody(data: any): boolean {
    return (typeof URLSearchParams !== "undefined" && data instanceof URLSearchParams)
      || (typeof ArrayBuffer !== "undefined" && (data instanceof ArrayBuffer || ArrayBuffer.isView(data)));
  }

  // 훅(beforeRequest) 이후의 opts 로 최종 URL 과 전송 데이터를 만든다. Fetch/XHR 공통이다.
  protected buildRequestData(url: string, method: string, opts: AjaxOptions): { finalUrl: string; preparedData: any; isForm: boolean } {
    this.assertNoFileInGet(method, opts.data);
    this.assertRawBody(method, opts);
    const hasFormData = isFormData(opts.data);
    // rawBody 는 파일도 multipart 로 감싸지 않고 그대로 보낸다
    const containsFile = !hasFormData && !opts.rawBody && this.containsFile(opts.data);
    const preparedData = containsFile ? this.buildFormDataFromObject(opts.data) : opts.data;
    return { finalUrl: this.getRequestUrl(url, method, preparedData, opts.params, opts.paramsSerializer), preparedData, isForm: hasFormData || containsFile };
  }

  // rawBody 는 그대로 보낼 수 있는 본문(File/Blob, ArrayBuffer·typed array, 문자열, URLSearchParams, FormData)만 허용한다.
  protected assertRawBody(method: string, opts: AjaxOptions): void {
    const data = opts.data;
    if (!opts.rawBody || data == null || this.isBodylessMethod(method)) return;
    const allowed = typeof data === "string" || isFormData(data) || this.isRawBody(data) || (typeof Blob !== "undefined" && data instanceof Blob);
    if (!allowed) throw new TypeError("rawBody 는 File/Blob, ArrayBuffer, typed array, 문자열, URLSearchParams, FormData 만 보낼 수 있습니다. 일반 객체는 rawBody 를 끄세요.");
  }

  /** 업로드 진행률 표시 대상인지 판단한다: 파일이 든 본문 또는 rawBody 본문. */
  protected isUploadProgressTarget(opts: AjaxOptions, method: string): boolean {
    // GET/HEAD 는 본문이 없으므로 rawBody 가 무시된다
    return this.hasFileData(opts.data) || (!!opts.rawBody && opts.data != null && !this.isBodylessMethod(method));
  }

  // beforeRequest 에서 opts.url 을 바꿨으면 baseUrl 을 적용해 새 URL 을 쓰고, 그대로면 기존 URL 을 쓴다.
  protected resolveUrl(url: string, originalUrl: string | undefined, opts: AjaxOptions): string {
    return opts.url !== originalUrl ? joinUrl(this.options.baseUrl, opts.url || "") : url;
  }

  protected getRequestUrl(url: string, method: string, data: any, params?: Record<string, unknown>, serializer?: (params: Record<string, unknown>) => string): string {
    const withData = this.getUrlWithData(url, method, data);
    if (!params) return withData;
    // params 는 메서드와 관계없이 쿼리 스트링으로 붙인다. paramsSerializer 가 있으면 그것으로 직렬화한다
    return this.appendQuery(withData, serializer ? serializer(params) : objectToQueryString(params));
  }

  // 오류 객체를 생성합니다. Fetch/XHR 공통이며 AjaxError 로 던져 Error 로 처리할 수 있게 합니다.
  protected createError(params: {
    type: AjaxErrorType;
    opts: AjaxOptions;
    xhr?: any;
    status?: number;
    statusText?: string;
    responseText?: string;
    headers?: Record<string, string>;
    error?: any;
    loadingInstance?: Loading | null;
  }): AjaxError {
    const { type, opts, xhr, error, loadingInstance } = params;
    const status = params.status ?? xhr?.status ?? 0;
    const statusText = params.statusText ?? xhr?.statusText ?? "";
    const responseText = params.responseText ?? this.readResponseText(xhr);

    let response: AjaxErrorResponse | undefined;
    if (type === "http" || type === "parse") {
      let data: unknown = responseText;
      if (opts.responseType === "json") {
        try {
          data = JSON.parse(responseText);
        } catch {
          data = undefined;
        }
      }
      response = { status, statusText, data, headers: params.headers ?? {} };
    }

    const message = type === "timeout" && opts.timeout && opts.timeout > 0 ? `timeout of ${opts.timeout}ms exceeded` : undefined;

    return new AjaxError({ type, message, status, statusText, responseText, error, xhr, loadingInstance, response });
  }

  // blob/arraybuffer 로 받는 XHR 은 responseText 접근이 예외를 던지므로 빈 문자열로 대체한다.
  protected readResponseText(xhr: any): string {
    try {
      return xhr?.responseText ?? "";
    } catch {
      return "";
    }
  }

  // GET/HEAD 는 본문을 보낼 수 없다. data 는 쿼리로 붙이고 기본 Content-Type 도 붙이지 않는다.
  protected isBodylessMethod(method: string): boolean {
    return method === "GET" || method === "HEAD";
  }

  // blob/arraybuffer 응답을 문자열로 디코드한다. 오류 응답 본문(JSON 메시지 등)을 읽는 데 사용하며, 읽을 수 없으면 빈 문자열이다.
  protected async binaryToText(value: unknown): Promise<string> {
    try {
      if (typeof Blob !== "undefined" && value instanceof Blob) {
        if (typeof value.text === "function") return await value.text();
        return await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result ?? ""));
          reader.onerror = () => reject(reader.error);
          reader.readAsText(value);
        });
      }
      // 다른 realm(iframe 등)의 ArrayBuffer 도 처리하도록 태그로 판별한다
      if (typeof TextDecoder !== "undefined" && Object.prototype.toString.call(value) === "[object ArrayBuffer]") return new TextDecoder().decode(value as ArrayBuffer);
    } catch {
      // 디코드 실패는 본문 없음으로 처리한다
    }
    return "";
  }

  protected isBinaryType(responseType?: string): boolean {
    return responseType === "blob" || responseType === "arraybuffer";
  }

  protected isSuccess(status: number, opts: AjaxOptions): boolean {
    return opts.validateStatus ? opts.validateStatus(status) : status >= 200 && status < 300;
  }

  // GET용: URL에 데이터를 쿼리 스트링으로 추가합니다.
  protected getUrlWithData(url: string, method:string, data: any): string {
    if (!this.isBodylessMethod(method)) return url;
    if (!data) return url;
    let qs: string;
    if (isFormData(data)) qs = this.formDataToQuery(data);
    else if (typeof data === "string") qs = data.replace(/^\?/, ""); // 문자열은 이미 직렬화된 쿼리로 보고 그대로 붙인다
    else if (typeof URLSearchParams !== "undefined" && data instanceof URLSearchParams) qs = data.toString();
    else qs = objectToQueryString(data);
    return this.appendQuery(url, qs);
  }

  // GET 은 본문을 보내지 않으므로 파일이 든 data 는 조용히 버려지는 대신 오류로 알린다.
  protected assertNoFileInGet(method: string, data: any): void {
    if (!this.isBodylessMethod(method)) return;
    if (this.hasFileData(data)) {
      throw new TypeError("GET/HEAD 요청은 파일을 전송할 수 없습니다. POST/PUT 을 사용하세요.");
    }
  }

  /** 본문에 파일(File/Blob/FileList 또는 파일이 든 FormData)이 있는지 검사한다. */
  public hasFileData(data: any): boolean {
    return isFormData(data) ? this.formDataHasFile(data) : this.containsFile(data);
  }

  /** showProgress 로 로더에 진행률을 표시할 요청인지 판단한다: 파일 업로드(rawBody 포함) 또는 blob/arraybuffer 다운로드. */
  public needsLoaderProgress(opts: AjaxOptions, method: string): boolean {
    return !!opts.showProgress && !!opts.loaderContainer && (this.isBinaryType(opts.responseType) || this.isUploadProgressTarget(opts, method));
  }

  private formDataHasFile(data: FormData): boolean {
    let found = false;
    data.forEach(value => { if (typeof value !== "string") found = true; });
    return found;
  }

  // GET 은 FormData 본문을 보낼 수 없으므로 문자열 항목을 쿼리로 펼친다. 파일 항목은 assertNoFileInGet 에서 이미 거절된다.
  private formDataToQuery(data: FormData): string {
    const search = new URLSearchParams();
    data.forEach((value, key) => search.append(key, value as string));
    return search.toString();
  }

  // 성공 응답 본문을 JSON 으로 파싱한다. 빈 본문(204 등)은 null, 파싱 실패는 type "parse" AjaxError 로 던진다.
  protected parseJsonBody(text: string, ctx: { opts: AjaxOptions; xhr?: any; status: number; statusText: string; headers?: Record<string, string>; loadingInstance?: Loading | null }): any {
    if (!text || !text.trim()) return null;
    try {
      return JSON.parse(text);
    } catch (e) {
      throw this.createError({ type: "parse", responseText: text, error: e, ...ctx });
    }
  }

  // 값이 없는(undefined/null/빈 문자열) 헤더를 제외한다. 0, false 는 유효한 값으로 보낸다.
  // 헤더 이름은 대소문자를 구분하지 않으므로 철자만 다른 키는 나중 값 하나만 남기고(요청 값이 전역 값을 대체),
  // 나중 값이 비어 있으면 앞의 값도 제거한다. Fetch/XHR 이 같은 헤더를 보내도록 공통으로 사용한다.
  protected cleanHeaders(headers?: Record<string, any>): Record<string, string> {
    const result: Record<string, string> = {};
    if (!headers) return result;
    const keyByLower = new Map<string, string>();
    for (const key of Object.keys(headers)) {
      const lower = key.toLowerCase();
      const previous = keyByLower.get(lower);
      if (previous !== undefined) {
        delete result[previous];
        keyByLower.delete(lower);
      }
      const value = headers[key];
      if (value !== undefined && value !== null && value !== "") {
        result[key] = String(value);
        keyByLower.set(lower, key);
      }
    }
    return result;
  }

  // URL 의 해시(#) 앞에 쿼리 스트링을 붙입니다.
  protected appendQuery(url: string, qs: string): string {
    // 직렬화기가 돌려준 선행 ? / & 는 구분자와 겹치지 않도록 제거한다
    qs = qs.replace(/^[?&]+/, "");
    if (!qs) return url;
    const hashIndex = url.indexOf("#");
    const base = hashIndex < 0 ? url : url.slice(0, hashIndex);
    const hash = hashIndex < 0 ? "" : url.slice(hashIndex);
    return base + (base.includes("?") ? "&" : "?") + qs + hash;
  }

  private isFileLike(value: any): boolean {
    return (typeof File !== "undefined" && (value instanceof File || value instanceof Blob)) || (typeof FileList !== "undefined" && value instanceof FileList);
  }

  // 단순 객체(파일 포함 가능)를 FormData로 변환
  protected buildFormDataFromObject(obj: any): FormData {
    const form = new FormData();

    const appendValue = (key: string, value: any) => {
      if (value === null || value === undefined) {
        return;
      }
      if (value instanceof Date) {
        form.append(key, isNaN(value.getTime()) ? String(value) : value.toISOString());
        return;
      }
      // 파일이 든 일반 객체·객체 배열은 JSON 으로 직렬화하면 파일이 사라지므로 key[child] 형태로 펼친다
      if (isArray(value) ? value.some(v => v !== null && typeof v === "object" && !this.isFileLike(v) && this.containsFile(v)) : isObject(value) && !this.isFileLike(value) && this.containsFile(value)) {
        for (const k of Object.keys(value)) appendValue(`${key}[${k}]`, value[k]);
        return;
      }
      if (typeof File !== "undefined" && (value instanceof File || value instanceof Blob)) {
        form.append(key, value);
        return;
      }
      if (typeof FileList !== "undefined" && value instanceof FileList) {
        for (let i = 0; i < value.length; i++) {
          form.append(key + (key.endsWith("[]") ? "" : "[]"), value[i]);
        }
        return;
      }
      if (Array.isArray(value)) {
        for (const v of value) {
          if (typeof File !== "undefined" && (v instanceof File || v instanceof Blob)) {
            form.append(key + (key.endsWith("[]") ? "" : "[]"), v);
          } else {
            form.append(key + (key.endsWith("[]") ? "" : "[]"), v instanceof Date && !isNaN(v.getTime()) ? v.toISOString() : typeof v === "object" ? JSON.stringify(v) : String(v));
          }
        }
        return;
      }
      if (isObject(value)) {
        // 객체일 경우 JSON.stringify로 직렬화
        form.append(key, JSON.stringify(value));
        return;
      }
      form.append(key, String(value));
    };

    // File/Blob/FileList 는 객체이지만 열거할 키가 없으므로 일반 객체처럼 펼치면 파일이 사라진다
    if (isObject(obj) && !this.isFileLike(obj)) {
      for (const k of Object.keys(obj)) {
        appendValue(k, (obj as any)[k]);
      }
    } else {
      // 비객체 또는 단일 File/Blob/FileList 는 "file" 필드로 보낸다
      appendValue("file", obj);
    }

    return form;
  }
  
}
