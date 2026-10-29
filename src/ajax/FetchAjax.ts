import { AjaxOptions, GlobalAjaxOptions } from "../types/web/AjaxOptions";
import { Loading } from "../Loading";
import { isFormData, isObject, objectToQueryString } from "../utils";
import { AjaxAbstract } from "./AjaxAbstract";

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

    const finalUrl = this.getRequestUrl(url, method, preparedData, opts.params);

    const fetchHeaders: Record<string, string> = { ...opts.headers };
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
      } else if (isObject(preparedData) && !this.isRawBody(preparedData)) {
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

    const { loadingInstance, abortController } = this.prepareRequest(opts);
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    let isTimeout = false;
    const onAbort = () => abortController?.abort();
    opts.signal?.addEventListener("abort", onAbort, { once: true });
    if (opts.signal?.aborted) onAbort();

    const fetchOptions: RequestInit = {
      method,
      headers: fetchHeaders,
      body,
      signal: abortController?.signal ?? opts.signal,
      credentials: opts.credentials,
    };

    try {
      if (opts.timeout && opts.timeout > 0 && abortController) {
        timeoutId = setTimeout(() => { isTimeout = true; abortController.abort(); }, opts.timeout);
      }
      if (fetchOptions.signal?.aborted) throw Object.assign(new Error("Request aborted"), { name: "AbortError" });
      const response = await fetch(finalUrl, fetchOptions);


      const text = await response.text();
      let data: any = text;

      if (opts.responseType === "json") {
        try {
          data = JSON.parse(text);
        } catch (e) {
          data = { error: (e as any).message };
        }
      }

      if (!this.isSuccess(response.status, opts)) {
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

      const result = {
        data,
        status: response.status,
        responseText: text,
        config: opts,
        xhr: response,
        headers: this.parseFetchHeaders(response),
        loadingInstance,
      };
      opts.beforeResponse?.(result, response, loadingInstance);
      return result;
    } catch (err: any) {
      if (timeoutId) clearTimeout(timeoutId);
      
      // 타임아웃 여부 판단: AbortError 且 isTimeout 플래그가 true이면 timeout
      let errorType: "network" | "http" | "timeout" | "abort" = "network";
      if (abortController?.signal.aborted || opts.signal?.aborted || err?.name === "AbortError") {
        errorType = isTimeout ? "timeout" : "abort";
      }

      return Promise.reject(
        this.createError({
          type: errorType,
          error: err,
          loadingInstance,
        })
      );
    } finally {
      opts.signal?.removeEventListener("abort", onAbort);
      if (timeoutId) clearTimeout(timeoutId);
    }
  }

  // 요청 준비를 처리합니다.
  private prepareRequest(opts: AjaxOptions): { loadingInstance: Loading | null; abortController: AbortController | null } {
    let loadingInstance: Loading | null = null;
    let abortController: AbortController | null = typeof AbortController !== "undefined" ? new AbortController() : null;
    const loaderSelector = opts.enableLoader === false ? null : opts.loaderContainer;

    if (loaderSelector) {
      if (opts.loaderOption?.enableCancelButton && typeof AbortController !== "undefined") {

        const originalCallback = opts.loaderOption.callback;
        opts.loaderOption = { ...opts.loaderOption, callback: () => {
          abortController!.abort();
          return originalCallback?.(opts);
        } };
      }

      loadingInstance = new Loading(loaderSelector, { ...opts.loaderOption, requestCount: 1 });
    }

    try {
      opts.beforeRequest?.(opts, null, loadingInstance);
    } catch (error) {
      loadingInstance?.hide();
      throw error;
    }

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
