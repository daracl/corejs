import { AjaxOptions, GlobalAjaxOptions } from "../types/web/AjaxOptions";
import { Loading } from "../Loading";
import { isObject, objectToQueryString } from "../utils";
import { AjaxAbstract } from "./AjaxAbstract";
import { AjaxError } from "./AjaxError";

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
  // beforeRequest 훅을 먼저 실행하고, 훅이 바꾼 opts(url, params, data, headers, timeout 등)로 요청을 만든다.
  public async request(url: string, method: string, opts: AjaxOptions) {
    // 파일이 든 GET 은 로더·훅 전에 거절한다
    this.assertNoFileInGet(method, opts.data);
    this.assertRawBody(method, opts);
    if (opts.signal?.aborted) {
      return Promise.reject(this.createError({ type: "abort", opts, error: Object.assign(new Error("Request aborted"), { name: "AbortError" }) }));
    }

    const originalUrl = opts.url;
    const { loadingInstance, abortController } = this.prepareRequest(opts);
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    let isTimeout = false;
    const onAbort = () => abortController?.abort();
    opts.signal?.addEventListener("abort", onAbort, { once: true });
    if (opts.signal?.aborted) onAbort();

    try {
      const { finalUrl, preparedData, isForm } = this.buildRequestData(this.resolveUrl(url, originalUrl, opts), method, opts);
      const fetchHeaders: Record<string, string> = this.cleanHeaders(opts.headers);
      const hasContentType = () => Object.keys(fetchHeaders).some(k => k.toLowerCase() === "content-type");
      let body: any = undefined;

      if (!this.isBodylessMethod(method)) {
        if (isForm) {
          body = preparedData;
          // 브라우저가 Content-Type과 boundary를 설정하도록 Content-Type 제거
          Object.keys(fetchHeaders).forEach(k => {
            if (k.toLowerCase() === "content-type") delete fetchHeaders[k];
          });
        } else if (opts.rawBody) {
          // 가공 없이 그대로 보낸다. Content-Type 은 직접 지정한 값이 없으면 Blob 의 type 을 브라우저가 사용한다
          body = preparedData ?? undefined;
        } else if (isObject(preparedData) && !this.isRawBody(preparedData)) {
          // 헤더 이름은 대소문자를 구분하지 않으므로 어떤 철자로 지정했는지 찾는다
          const contentTypeKey = Object.keys(fetchHeaders).find(k => k.toLowerCase() === "content-type");
          const contentType = contentTypeKey ? fetchHeaders[contentTypeKey].toLowerCase() : "";
          if (contentType.includes("application/x-www-form-urlencoded")) {
            body = objectToQueryString(preparedData);
          } else {
            // 기본 JSON
            if (!contentTypeKey) {
              fetchHeaders["Content-Type"] = "application/json";
            }
            body = JSON.stringify(preparedData);
          }
        } else if (preparedData != null) {
          body = preparedData;
          // XHR 과 같이 문자열 본문은 Content-Type 이 없으면 form-urlencoded 로 보낸다
          if (typeof preparedData === "string" && !hasContentType()) {
            fetchHeaders["Content-Type"] = "application/x-www-form-urlencoded";
          }
        }
      }

      const fetchOptions: RequestInit = {
        method,
        headers: fetchHeaders,
        body,
        signal: abortController?.signal ?? opts.signal,
        credentials: opts.credentials,
      };

      if (opts.timeout && opts.timeout > 0 && abortController) {
        timeoutId = setTimeout(() => { isTimeout = true; abortController.abort(); }, opts.timeout);
      }
      if (fetchOptions.signal?.aborted) throw Object.assign(new Error("Request aborted"), { name: "AbortError" });
      const response = await fetch(finalUrl, fetchOptions);

      if (!this.isSuccess(response.status, opts)) {
        const errorText = await response.text();
        return Promise.reject(
          this.createError({
            type: "http",
            opts,
            status: response.status,
            statusText: response.statusText,
            responseText: errorText,
            xhr: response,
            headers: this.parseFetchHeaders(response),
            loadingInstance,
          })
        );
      }

      const headers = this.parseFetchHeaders(response);
      const binary = this.isBinaryType(opts.responseType);
      const text = binary ? "" : await response.text();
      const data = binary ? await (opts.responseType === "blob" ? response.blob() : response.arrayBuffer()) : opts.responseType === "json" ? this.parseJsonBody(text, { opts, xhr: response, status: response.status, statusText: response.statusText, headers, loadingInstance }) : text;

      const result = {
        data,
        status: response.status,
        responseText: text,
        config: opts,
        xhr: response,
        headers,
        loadingInstance,
      };
      try {
        opts.beforeResponse?.(result, response, loadingInstance);
      } catch (error) {
        throw this.createError({ type: "callback", opts, error, xhr: response, status: response.status, statusText: response.statusText, loadingInstance });
      }
      return result;
    } catch (err: any) {
      if (timeoutId) clearTimeout(timeoutId);

      // 파싱·콜백 오류는 이미 AjaxError 이므로 전송 오류로 재분류하지 않는다
      if (err instanceof AjaxError) return Promise.reject(err);

      // 타임아웃 여부 판단: AbortError 且 isTimeout 플래그가 true이면 timeout
      let errorType: "network" | "http" | "timeout" | "abort" = "network";
      if (abortController?.signal.aborted || opts.signal?.aborted || err?.name === "AbortError") {
        errorType = isTimeout ? "timeout" : "abort";
      }

      return Promise.reject(
        this.createError({
          type: errorType,
          opts,
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
      throw this.createError({ type: "callback", opts, error, loadingInstance });
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
}
