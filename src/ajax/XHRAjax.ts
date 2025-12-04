import { AjaxOptions } from "@t/web/AjaxOptions";
import { hasProperty, isFormData, isObject , objectToQueryString } from "@/utils";
import { Loading } from "@/Loading";
import { AjaxAbstract } from "./AjaxAbstract";

/**
 * XHRAjax 클래스
 * 
 * XHR 기반의 Ajax 요청을 처리하는 클래스입니다.
 */
export class XHRAjax extends AjaxAbstract {
  
  constructor(options: AjaxOptions) {
     super(options);
  }

  public async request(url: string, method: string, opts: AjaxOptions) {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();

      // 준비: 데이터가 FormData 또는 파일을 포함하는지 검사하고 필요시 FormData로 변환
      const hasFormData = isFormData(opts.data);
      const containsFile = !hasFormData && this.containsFile(opts.data);
      let preparedData: any = opts.data;

      if (containsFile) {
        preparedData = this.buildFormDataFromObject(opts.data);
      }
     
      // GET 요청이면 쿼리스트링으로 처리 (FormData인 경우는 URL에 붙이지 않음)
      const finalUrl = this.getUrlWithData(opts.baseUrl+url, method, preparedData);

      xhr.open(method, finalUrl, opts.async !== false);

      console.log("XHRAjax request", method, finalUrl, opts);

      if (opts.timeout && opts.timeout > 0) xhr.timeout = opts.timeout;

      // headers 설정 — FormData 전송 시 Content-Type을 직접 설정하면 boundary가 깨지므로 설정하지 않음
      this.setHeaders(xhr, opts, hasFormData || containsFile);

      const { loadingInstance } = this.prepareRequest(opts, xhr);

      xhr.onreadystatechange = () => {
        if (xhr.readyState === XMLHttpRequest.DONE) {
          const response = this.parseResponse(xhr, opts);
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve({ ...response, loadingInstance });
          } else {
            reject(this.createError({ type: "http", xhr, loadingInstance, ...response }));
          }
        }
      };

      xhr.onerror = () => reject(this.createError({ type: "network", xhr, loadingInstance }));
      xhr.ontimeout = () => reject(this.createError({ type: "timeout", xhr, loadingInstance }));
      xhr.onabort = () => reject(this.createError({ type: "abort", xhr, loadingInstance }));

      // 전송: GET 혹은 데이터가 없는 경우는 send(); FormData가 준비된 경우는 그대로 전송; JSON/Object일 경우 적절히 직렬화
      if (method === "GET" || !preparedData) {
        xhr.send();
      } else if (isFormData(preparedData)) {
        xhr.send(preparedData);
      } else if (isObject(preparedData)) {
        // JSON 전송을 기본으로 하되 headers에서 Content-Type이 다른 값으로 설정되어 있으면 그 값을 따름
        const contentType = (opts.headers && (opts.headers as any)["Content-Type"]) || "";
        if (contentType.includes("application/x-www-form-urlencoded")) {
          xhr.send(objectToQueryString(preparedData));
        } else {
          xhr.send(JSON.stringify(preparedData));
        }
      } else {
        // 기타 (문자열 등)
        xhr.send(preparedData);
      }
    });
  }

  // 응답을 파싱합니다.
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
    const headers = opts.headers || {};
    if (!isFormData) {
      if (!hasProperty(headers, "Content-Type")) {
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
    let loaderSelector =
      opts.loaderContainer || (opts.enableDefaultLoader ? this.options.loaderContainer || "body" : null);

    if (loaderSelector){
      loadingInstance = new Loading(loaderSelector, opts.loaderOption);
      if (opts.loaderOption?.enableCancelButton) {
        
        const originalCallback = opts.loaderOption.callback;
        opts.loaderOption.callback = () => {
          if (originalCallback) originalCallback(opts);
          xhr.abort();
        };
      }
    }

    if (opts.beforeRequest) opts.beforeRequest.call(null, opts, null, loadingInstance);

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
