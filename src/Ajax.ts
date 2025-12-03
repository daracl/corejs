// src/Ajax.ts
import { AjaxOptions } from "@t/web/AjaxOptions";
import { deepMerge, hasProperty, isObject } from "./utils";
import { objectToQueryString } from "./utils/objectToQueryString";
import { Loading } from "./Loading";

export class Ajax {
  private options: AjaxOptions;

  constructor(options?: AjaxOptions) {
    this.options = deepMerge({}, this.createDefaultOptions(), options || {});
  }

  createDefaultOptions(): AjaxOptions {
    return {
      baseUrl: "",
      url: "",
      method: "POST",
      timeout: -1,
      ignoreResultCheck: false,
      async: true,
      errorAlertView: true,
      responseType: "json",
      headers: { "X-Requested-With": "XMLHttpRequest" },
      loaderContainer: "",
      enableDefaultLoader: false,
      loaderOption: {},
    };
  }

  public static create(options?: AjaxOptions) {
    return new Ajax(options);
  }

  public request(options: AjaxOptions) {
    return this.ajax(options?.url || "", options.method || "POST", options);
  }

  public get(url: string, options?: AjaxOptions) {
    return this.ajax(url, "GET", options);
  }

  public post(url: string, options?: AjaxOptions) {
    return this.ajax(url, "POST", options);
  }

  public put(url: string, options?: AjaxOptions) {
    return this.ajax(url, "PUT", options);
  }

  public delete(url: string, options?: AjaxOptions) {
    return this.ajax(url, "DELETE", options);
  }

  /**
   * Ajax 요청 처리
   * fetch가 있으면 fetch 우선, 없으면 XHR fallback
   */
  private async ajax(url: string, method: string, options?: AjaxOptions): Promise<any> {
    const opts = deepMerge({}, this.options, options || {});
    const ajaxMethd = method || "GET";
    opts.method = ajaxMethd;

    url = opts.baseUrl + url;

    if (ajaxMethd.toLowerCase() === "get" && opts.data) {
      url = this.getUrlWithData(url, opts);
    }

    // 공통 처리: loader 생성, beforeRequest 호출, cancel callback
    const { loadingInstance, abortController } = this.prepareRequest(opts);
    
    // fetch 사용
    if (typeof fetch === "function") {
      const fetchOptions: RequestInit = {
        method: ajaxMethd,
        headers: opts.headers,
      };

      if (ajaxMethd.toLowerCase() !== "get" && opts.data) {
        fetchOptions.body = JSON.stringify(opts.data);
      }

      if (abortController) {
        fetchOptions.signal = abortController.signal;
      }

      try {
        const response = await fetch(url, fetchOptions);
        const text = await response.text();
        let data: any = text;

        if (opts.responseType === "json") {
          try {
            data = JSON.parse(text);
          } catch (e) {
            data = { error: (e as any).message };
          }
        }

        if (!response.ok) {
          return Promise.reject({ error: new Error(`Request failed with status ${response.status}`), xhr: response, loadingInstance });
        }

        return Promise.resolve({
          data,
          status: response.status,
          responseText: text,
          config: opts,
          headers: this.parseFetchHeaders(response),
          loadingInstance,
        });
      } catch (err) {
        return Promise.reject({ error: err, xhr: null, loadingInstance });
      }
    }

    // fetch fallback: XHR
    return this.ajaxXHR(url, ajaxMethd, opts, loadingInstance);
  }

  /**
   * XHR 처리
   */
  private ajaxXHR(url: string, method: string, opts: AjaxOptions, loadingInstance: Loading|null): Promise<any> {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();

      xhr.open(method, this.getUrlWithData(url, opts), opts.async !== false);
      if (opts.timeout && opts.timeout > 0) xhr.timeout = opts.timeout;

      this.setHeaders(xhr, opts);

      xhr.onreadystatechange = () => {
        if (xhr.readyState === XMLHttpRequest.DONE) {
          const response = this.parseResponse(xhr, opts);
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve({ ...response, loadingInstance });
          } else {
            reject({ error: new Error(`Request failed with status ${xhr.status}`), xhr, loadingInstance });
          }
        }
      };

      xhr.onerror = () => reject({ error: new Error("Network error"), xhr, loadingInstance });

      if (method.toLowerCase() === "get" || !opts.data) {
        xhr.send();
      } else {
        xhr.send(JSON.stringify(opts.data));
      }
    });
  }

  /**
   * 공통 처리: loader, beforeRequest, cancel button
   */
  private prepareRequest(opts: AjaxOptions): { loadingInstance: Loading | null; abortController: AbortController | null } {
    let loadingInstance: Loading | null = null;
    let abortController: AbortController | null = null;

    if (opts.enableDefaultLoader && opts.loaderContainer) {
      loadingInstance = new Loading(opts.loaderContainer, opts.loaderOption);
    }

    if (opts.loaderOption?.enableCancelButton && typeof AbortController !== "undefined") {
      abortController = new AbortController();

      const originalCallback = opts.loaderOption.callback;
      opts.loaderOption.callback = () => {
        if (originalCallback) originalCallback(opts);
        abortController!.abort();
      };
    }

    if (opts.beforeRequest) {
      opts.beforeRequest.call(null, opts, null, loadingInstance);
    }

    return { loadingInstance, abortController };
  }

  private parseResponse(xhr: XMLHttpRequest, opts: AjaxOptions) {
    let result: any = xhr.responseText;

    if (opts.responseType === "json") {
      try {
        result = JSON.parse(xhr.responseText);
      } catch (e) {
        result = { error: (e as any).message };
      }
    }

    return {
      data: result,
      status: xhr.status,
      responseText: xhr.responseText,
      config: opts,
      headers: this.getResponseHeaders(xhr),
    };
  }

  private parseFetchHeaders(response: Response) {
    const headersObj: Record<string, string> = {};
    response.headers.forEach((value, key) => {
      headersObj[key] = value;
    });
    return headersObj;
  }

  private getResponseHeaders(xhr: XMLHttpRequest) {
    const headersObj: Record<string, string> = {};
    const allHeaders = xhr.getAllResponseHeaders();
    const lines = allHeaders.trim().split(/[\r\n]+/);

    console.log("allHeaders:", allHeaders);

    for (const line of lines) {
      const parts = line.split(": ");
      const key = parts.shift();
      const value = parts.join(": ");
      if (key) headersObj[key] = value;
    }

    return headersObj;
  }

  private getUrlWithData(url: string, opts: AjaxOptions): string {
    if (!opts.data) return url;
    const qs = objectToQueryString(opts.data);
    return url + (url.includes("?") ? "&" : "?") + qs;
  }

  private setHeaders(xhr: XMLHttpRequest, opts: AjaxOptions) {
    const headers = opts.headers || {};

    if (!hasProperty(headers, "Content-Type")) {
      headers["Content-Type"] = isObject(opts.data) ? "application/json" : "application/x-www-form-urlencoded";
    }

    for (const key of Object.keys(headers)) {
      if (headers[key]) xhr.setRequestHeader(key, headers[key]);
    }
  }
}
