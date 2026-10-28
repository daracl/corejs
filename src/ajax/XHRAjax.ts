import { AjaxOptions, GlobalAjaxOptions } from "@t/web/AjaxOptions";
import { isFormData, isObject , objectToQueryString } from "@/utils";
import { Loading } from "@/Loading";
import { AjaxAbstract } from "./AjaxAbstract";

/**
 * XHRAjax 클래스
 * 
 * XHR 기반의 Ajax 요청을 처리하는 클래스입니다.
 */
export class XHRAjax extends AjaxAbstract {
  
  constructor(options: GlobalAjaxOptions) {
     super(options);
  }

  public async request(url: string, method: string, opts: AjaxOptions) {
    if (opts.credentials === "omit") {
      throw new TypeError('credentials="omit" requires fetch; XHR cannot omit same-origin cookies.');
    }
    let cleanup = () => {};
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      const hasFormData = isFormData(opts.data);
      const containsFile = !hasFormData && this.containsFile(opts.data);
      const preparedData = containsFile ? this.buildFormDataFromObject(opts.data) : opts.data;
      const finalUrl = this.getRequestUrl(url, method, preparedData, opts.params);
      xhr.open(method, finalUrl, opts.async !== false);
      if (opts.timeout && opts.timeout > 0) xhr.timeout = opts.timeout;
      if (opts.credentials !== undefined) xhr.withCredentials = opts.credentials === "include";
      this.setHeaders(xhr, opts, hasFormData || containsFile);

      let loadingInstance: Loading | null = null;
      let settled = false;
      const fail = (type: "network" | "http" | "timeout" | "abort", error?: any) => {
        if (settled) return;
        settled = true;
        reject(this.createError({ type, xhr, loadingInstance, error }));
      };
      const onAbort = () => { xhr.abort(); fail("abort"); };
      cleanup = () => opts.signal?.removeEventListener("abort", onAbort);
      opts.signal?.addEventListener("abort", onAbort, { once: true });

      xhr.onreadystatechange = () => {
        if (settled || xhr.readyState !== XMLHttpRequest.DONE || xhr.status === 0) return;
        try {
          if (!this.isSuccess(xhr.status, opts)) { fail("http"); return; }
          const result = { ...this.parseResponse(xhr, opts), xhr, config: opts, loadingInstance };
          opts.beforeResponse?.(result, xhr, loadingInstance);
          settled = true;
          resolve(result);
        } catch (error) { fail("network", error); }
      };
      xhr.onerror = () => fail("network");
      xhr.ontimeout = () => fail("timeout");
      xhr.onabort = () => fail("abort");
      if (opts.onUploadProgress && xhr.upload) {
        xhr.upload.onprogress = ev => opts.onUploadProgress!({ xhr, ev });
      }
      if (opts.onDownloadProgress) {
        xhr.onprogress = ev => opts.onDownloadProgress!({ xhr, ev });
      }

      try {
        if (opts.signal?.aborted) { fail("abort"); return; }
        loadingInstance = this.prepareRequest(opts, xhr).loadingInstance;
        opts.beforeRequest?.(opts, xhr, loadingInstance);
        if (opts.signal?.aborted || settled) { fail("abort"); return; }
        if (method === "GET" || preparedData == null) {
          xhr.send();
        } else if (isFormData(preparedData)) {
          xhr.send(preparedData);
        } else if (isObject(preparedData)) {
          const contentType = Object.entries(opts.headers || {}).find(([key]) => key.toLowerCase() === "content-type")?.[1] || "";
          xhr.send(String(contentType).includes("application/x-www-form-urlencoded") ? objectToQueryString(preparedData) : JSON.stringify(preparedData));
        } else {
          xhr.send(preparedData);
        }
      } catch (error) { fail("network", error); }
    }).finally(() => cleanup());
  }

  private parseResponse(xhr: XMLHttpRequest, opts: AjaxOptions) {
    let responseText = xhr.responseText;
    let data: any = responseText;

    if (opts.responseType === "json") {
      try {
        data = JSON.parse(xhr.responseText);
      } catch (e) {
        data = { error: (e as any).message };
      }
    }

    return {
      data,
      status: xhr.status,
      readyState: xhr.readyState,
      responseText,
      headers: this.getResponseHeaders(xhr),
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
  private setHeaders(xhr: XMLHttpRequest, opts: AjaxOptions, isFormData = false) {
    const headers = { ...opts.headers };
    if (!isFormData) {
      if (!Object.keys(headers).some(key => key.toLowerCase() === "content-type")) {
        headers["Content-Type"] = isObject(opts.data) ? "application/json" : "application/x-www-form-urlencoded";
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
  
  // 오류 객체를 생성합니다.  
  private createError(params: {
    type: "network" | "http" | "timeout" | "abort";
    xhr?: XMLHttpRequest;
    status?: number;
    statusText?: string;
    responseText?: string;
    error?: any;
    loadingInstance?: Loading | null;
  }) {
    const { type, xhr, status, statusText, responseText, error, loadingInstance } = params;
    return {
      type,
      status: status ?? (xhr ? xhr.status : 0),
      statusText: statusText ?? (xhr ? xhr.statusText : ""),
      responseText: responseText ?? (xhr ? xhr.responseText : ""),
      error: error ?? null,
      xhr,
      loadingInstance,
    };
  }
}
