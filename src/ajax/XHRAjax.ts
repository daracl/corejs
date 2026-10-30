import { AjaxOptions, GlobalAjaxOptions } from "../types/web/AjaxOptions";
import { isFormData, isObject , objectToQueryString } from "../utils";
import { Loading } from "../Loading";
import { AjaxAbstract } from "./AjaxAbstract";
import { AjaxError } from "./AjaxError";

/**
 * XHRAjax 클래스
 * 
 * XHR 기반의 Ajax 요청을 처리하는 클래스입니다.
 */
export class XHRAjax extends AjaxAbstract {
  
  constructor(options: GlobalAjaxOptions) {
     super(options);
  }

  // beforeRequest 훅은 열린 xhr 을 받으므로 먼저 open 한 뒤 실행한다. 훅 이후 opts(url, params, data, headers, timeout 등)를 다시 읽어 요청에 반영한다.
  public async request(url: string, method: string, opts: AjaxOptions) {
    if (opts.credentials === "omit") {
      throw new TypeError('credentials="omit" requires fetch; XHR cannot omit same-origin cookies.');
    }
    let cleanup = () => {};
    return new Promise((resolve, reject) => {
      const sync = opts.async === false;
      const binaryNotAllowed = () => new TypeError(`responseType="${opts.responseType}" 는 async:false 와 함께 쓸 수 없습니다.`);
      if (sync && this.isBinaryType(opts.responseType)) throw binaryNotAllowed();

      const originalUrl = opts.url;
      const initial = this.buildRequestData(url, method, opts);
      const xhr = new XMLHttpRequest();
      xhr.open(method, initial.finalUrl, !sync);

      let loadingInstance: Loading | null = null;
      let settled = false;
      const fail = (type: "network" | "http" | "timeout" | "abort" | "callback", error?: any, responseText?: string) => {
        if (settled) return;
        settled = true;
        reject(this.createError({ type, opts, xhr, loadingInstance, error, responseText, headers: type === "http" ? this.getResponseHeaders(xhr) : undefined }));
      };
      const onAbort = () => { xhr.abort(); fail("abort"); };
      cleanup = () => opts.signal?.removeEventListener("abort", onAbort);
      opts.signal?.addEventListener("abort", onAbort, { once: true });

      xhr.onreadystatechange = () => {
        if (settled || xhr.readyState !== XMLHttpRequest.DONE || xhr.status === 0) return;
        if (!this.isSuccess(xhr.status, opts)) {
          // 바이너리로 받은 오류 응답은 responseText 가 없으므로 디코드해서 오류 본문을 보존한다
          if (this.isBinaryType(opts.responseType)) this.binaryToText(xhr.response).then(text => fail("http", undefined, text));
          else fail("http");
          return;
        }
        let result: any;
        try {
          result = { ...this.parseResponse(xhr, opts, loadingInstance), xhr, config: opts, loadingInstance };
        } catch (error) {
          settled = true;
          reject(error instanceof AjaxError ? error : this.createError({ type: "network", opts, xhr, loadingInstance, error }));
          return;
        }
        try {
          opts.beforeResponse?.(result, xhr, loadingInstance);
        } catch (error) { fail("callback", error); return; }
        settled = true;
        resolve(result);
      };
      xhr.onerror = () => fail("network");
      xhr.ontimeout = () => fail("timeout");
      xhr.onabort = () => fail("abort");
      // 로더에 진행률(%)을 표시한다. 파일 업로드와 blob/arraybuffer 다운로드만 대상이며, 전체 크기를 알 수 없으면 표시하지 않는다
      let progressUpload = false;
      const showProgress = (ev: ProgressEvent, phase: "upload" | "download") => {
        if (!opts.showProgress || !loadingInstance || !ev.lengthComputable || ev.total <= 0) return;
        if (phase === "upload" ? !progressUpload : !this.isBinaryType(opts.responseType)) return;
        loadingInstance.setContent(`${Math.min(100, Math.floor((ev.loaded / ev.total) * 100))}%`);
      };
      if ((opts.onUploadProgress || opts.showProgress) && xhr.upload) {
        xhr.upload.onprogress = ev => { showProgress(ev, "upload"); opts.onUploadProgress?.({ xhr, ev }); };
      }
      if (opts.onDownloadProgress || opts.showProgress) {
        xhr.onprogress = ev => { showProgress(ev, "download"); opts.onDownloadProgress?.({ xhr, ev }); };
      }

      try {
        if (opts.signal?.aborted) { fail("abort"); return; }
        loadingInstance = this.prepareRequest(opts, xhr).loadingInstance;

        // 훅이 xhr.setRequestHeader 를 직접 호출한 값을 기록한다. URL 이 바뀌어 다시 open 하면 헤더가 초기화되기 때문이다
        const recorded: [string, string][] = [];
        const nativeSetRequestHeader = xhr.setRequestHeader;
        xhr.setRequestHeader = function (this: XMLHttpRequest, name: string, value: string) {
          recorded.push([name, value]);
          return nativeSetRequestHeader.call(xhr, name, value);
        };
        try {
          opts.beforeRequest?.(opts, xhr, loadingInstance);
        } catch (error) { fail("callback", error); return; } finally {
          delete (xhr as any).setRequestHeader;
        }
        if (opts.signal?.aborted || settled) { fail("abort"); return; }

        // 훅 이후의 opts 로 요청을 다시 구성한다
        const built = this.buildRequestData(this.resolveUrl(url, originalUrl, opts), method, opts);
        if (built.finalUrl !== initial.finalUrl) {
          xhr.open(method, built.finalUrl, !sync);
          for (const [name, value] of recorded) xhr.setRequestHeader(name, value);
        }
        if (this.isBinaryType(opts.responseType)) {
          if (sync) throw binaryNotAllowed();
          xhr.responseType = opts.responseType as XMLHttpRequestResponseType;
        }
        // 동기 XHR 은 timeout 설정 시 브라우저가 예외를 던지므로 적용하지 않는다
        if (!sync && opts.timeout && opts.timeout > 0) xhr.timeout = opts.timeout;
        if (opts.credentials !== undefined) xhr.withCredentials = opts.credentials === "include";
        // 훅 이후의 data/responseType 기준으로 진행률 표시 대상인지 정하고 0% 로 시작한다
        progressUpload = !!opts.showProgress && this.isUploadProgressTarget(opts, method);
        if (progressUpload || (opts.showProgress && this.isBinaryType(opts.responseType))) loadingInstance?.setContent("0%");
        // setHeaders 와 본문 직렬화가 같은 헤더를 보도록 한 번만 정리한다
        const headers = this.cleanHeaders(opts.headers);
        this.setHeaders(xhr, method, headers, built.isForm, opts.rawBody ? null : built.preparedData);

        const preparedData = built.preparedData;
        if (this.isBodylessMethod(method) || preparedData == null) {
          xhr.send();
        } else if (isFormData(preparedData) || opts.rawBody) {
          // FormData 와 rawBody 는 가공 없이 그대로 보낸다
          xhr.send(preparedData);
        } else if (isObject(preparedData) && !this.isRawBody(preparedData)) {
          const contentType = Object.entries(headers).find(([key]) => key.toLowerCase() === "content-type")?.[1] || "";
          xhr.send(contentType.toLowerCase().includes("application/x-www-form-urlencoded") ? objectToQueryString(preparedData) : JSON.stringify(preparedData));
        } else {
          xhr.send(preparedData);
        }
      } catch (error) { fail("network", error); }
    }).finally(() => cleanup());
  }

  private parseResponse(xhr: XMLHttpRequest, opts: AjaxOptions, loadingInstance: Loading | null) {
    const binary = this.isBinaryType(opts.responseType);
    const responseText = binary ? "" : xhr.responseText;
    const headers = this.getResponseHeaders(xhr);
    const data: any = binary ? xhr.response : opts.responseType === "json" ? this.parseJsonBody(responseText, { opts, xhr, status: xhr.status, statusText: xhr.statusText, headers, loadingInstance }) : responseText;

    return {
      data,
      status: xhr.status,
      readyState: xhr.readyState,
      responseText,
      headers,
    };
  }

  // 응답 headers를 파싱합니다.
  private getResponseHeaders(xhr: XMLHttpRequest) {
    const headersObj: Record<string, string> = {};
    const allHeaders = xhr.getAllResponseHeaders();
    const lines = allHeaders.trim().split(/[\r\n]+/);
    for (const line of lines) {
      const parts = line.split(": ");
      const key = parts.shift();
      const value = parts.join(": ");
      if (key) headersObj[key] = value;
    }
    return headersObj;
  }

  // 요청 headers를 설정합니다.
  // isFormData가 true이면 Content-Type을 설정하지 않아 브라우저가 boundary 포함한 적절한 헤더를 생성하도록 함
  private setHeaders(xhr: XMLHttpRequest, method: string, requestHeaders: Record<string, string>, isFormData = false, body?: any) {
    const headers = { ...requestHeaders };
    if (!isFormData) {
      // 본문이 없는 요청(GET/HEAD, data 없음)과 raw 본문(ArrayBuffer 등)에는 기본 Content-Type 을 붙이지 않는다. Fetch 와 같은 규칙이다.
      if (!this.isBodylessMethod(method) && body != null && !this.isRawBody(body) && !Object.keys(headers).some(key => key.toLowerCase() === "content-type")) {
        headers["Content-Type"] = isObject(body) ? "application/json" : "application/x-www-form-urlencoded";
      }
      for (const key of Object.keys(headers)) {
        if (headers[key]) xhr.setRequestHeader(key, headers[key]);
      }
    } else {
      // FormData 전송 시 다른 헤더는 그대로 설정(단 Content-Type은 제외)
      for (const key of Object.keys(headers)) {
        if (key.toLowerCase() === "content-type") continue;
        if (headers[key]) xhr.setRequestHeader(key, headers[key]);
      }
    }
  }
  
  // 요청 준비를 처리합니다.
  private prepareRequest(opts: AjaxOptions, xhr: XMLHttpRequest) {
    let loadingInstance: Loading | null = null;
    const loaderSelector = opts.enableLoader === false ? null : opts.loaderContainer;

    if (loaderSelector){
      if (opts.loaderOption?.enableCancelButton) {
        const originalCallback = opts.loaderOption.callback;
        opts.loaderOption = { ...opts.loaderOption, callback: () => {
          xhr.abort();
          return originalCallback?.(opts);
        } };
      }

      loadingInstance = new Loading(loaderSelector, { ...opts.loaderOption, requestCount: 1 });
    }



    return { loadingInstance };
  }
}
