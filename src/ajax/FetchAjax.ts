import { AjaxOptions, GlobalAjaxOptions } from "@t/web/AjaxOptions";
import { Loading } from "@/Loading";
import { isObject, objectToQueryString } from "@/utils";
import { AjaxAbstract } from "./AjaxAbstract";
import { isFormData } from "@/utils/isFormData";

/**
 * FetchAjax 클래스
 *
 * Fetch API 기반의 Ajax 요청을 처리하는 클래스입니다.
 */
export class FetchAjax extends AjaxAbstract {
  
  constructor(options: GlobalAjaxOptions) {
    super(options);
  }

  // Fetch 요청을 처리합니다.
  public async request(url: string, method: string, opts: AjaxOptions) {
    // 데이터 준비: FormData 또는 파일 포함 여부 검사 및 변환
    const hasFormData = isFormData(opts.data);
    const containsFile = !hasFormData && this.containsFile(opts.data);
    let preparedData: any = opts.data;

    if (containsFile && !hasFormData) {
      preparedData = this.buildFormDataFromObject(opts.data);
    }

    const finalUrl = this.getUrlWithData(url, method, preparedData);

    const { loadingInstance, abortController } = this.prepareRequest(opts);

    // timeout 처리
    let timeoutId: any = null;
    let isTimeout = false;
    if (opts.timeout && opts.timeout > 0 && abortController) {
      timeoutId = setTimeout(() =>{
        isTimeout = true; // 타임아웃 발생 표시
        abortController.abort()
       }, opts.timeout);
    }

    // 요청 바디 / 헤더 준비
    const fetchHeaders: Record<string, string> | undefined = opts.headers ? { ...opts.headers } : undefined;
    let body: any = undefined;

    if (method !== "GET") {
      if (isFormData(preparedData)) {
        body = preparedData;
        // 브라우저가 Content-Type과 boundary를 설정하도록 Content-Type 제거
        if (fetchHeaders) {
          Object.keys(fetchHeaders).forEach(k => {
            if (k.toLowerCase() === "content-type") delete fetchHeaders[k];
          });
        }
      } else if (containsFile) {
        // 이미 converted to FormData
        body = preparedData;
        if (fetchHeaders) {
          Object.keys(fetchHeaders).forEach(k => {
            if (k.toLowerCase() === "content-type") delete fetchHeaders[k];
          });
        }
      } else if (isObject(preparedData)) {
        const contentType = (fetchHeaders && (fetchHeaders["Content-Type"] || fetchHeaders["content-type"])) || "";
        if (contentType.includes("application/x-www-form-urlencoded")) {
          body = objectToQueryString(preparedData);
        } else {
          // 기본 JSON
          if (fetchHeaders && !("Content-Type" in fetchHeaders) && !("content-type" in fetchHeaders)) {
            fetchHeaders["Content-Type"] = "application/json";
          }
          body = JSON.stringify(preparedData);
        }
      } else if (preparedData != null) {
        body = preparedData;
      }
    }

    const fetchOptions: RequestInit = {
      method,
      headers: fetchHeaders,
      body,
      signal: abortController?.signal,
    };

    try {
      const response = await fetch(finalUrl, fetchOptions);
      if (timeoutId) clearTimeout(timeoutId);

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
        return Promise.reject(
          this.createError({
            type: "http",
            status: response.status,
            statusText: response.statusText,
            responseText: text,
            xhr: response,
            loadingInstance,
          })
        );
      }

      return {
        data,
        status: response.status,
        responseText: text,
        config: opts,
        headers: this.parseFetchHeaders(response),
        loadingInstance,
      };
    } catch (err: any) {
      if (timeoutId) clearTimeout(timeoutId);
      
      // 타임아웃 여부 판단: AbortError 且 isTimeout 플래그가 true이면 timeout
      let errorType: "network" | "http" | "timeout" | "abort" = "network";
      if (err.name === "AbortError") {
        errorType = isTimeout ? "timeout" : "abort";
      }

      return Promise.reject(
        this.createError({
          type: errorType,
          error: err,
          loadingInstance,
        })
      );
    }
  }

  // 요청 준비를 처리합니다.
  private prepareRequest(opts: AjaxOptions): { loadingInstance: Loading | null; abortController: AbortController | null } {
    let loadingInstance: Loading | null = null;
    let abortController: AbortController | null = null;
    const loaderSelector = opts.loaderContainer;

    if (loaderSelector) {
      if (opts.loaderOption?.enableCancelButton && typeof AbortController !== "undefined") {
        abortController = new AbortController();
        const originalCallback = opts.loaderOption.callback;
        opts.loaderOption.callback = () => {
          abortController!.abort();
          if (originalCallback) originalCallback(opts);
        };
      }

      loadingInstance = new Loading(loaderSelector, opts.loaderOption);
    }

    if (opts.beforeRequest) opts.beforeRequest.call(null, opts, null, loadingInstance);

    return { loadingInstance, abortController };
  }
  

  // 응답 headers를 파싱합니다.
  private parseFetchHeaders(response: Response) {
    const headersObj: Record<string, string> = {};
    response.headers.forEach((value, key) => {
      headersObj[key] = value;
    });
    return headersObj;
  }

  // 오류 객체를 생성합니다.
  private createError(params: {
    type: "network" | "http" | "timeout" | "abort";
    xhr?: Response;
    status?: number;
    statusText?: string;
    responseText?: string;
    error?: any;
    loadingInstance?: Loading | null;
  }) {
    const { type, xhr, status, statusText, responseText, error, loadingInstance } = params;

    const reqXhr = xhr || {};

    return {
      type,
      status: status ?? (reqXhr as any).status ?? 0,
      statusText: statusText ?? (reqXhr as any).statusText ?? "",
      responseText: responseText ?? "",
      error: error ?? null,
      xhr,
      loadingInstance,
    };
  }
}
