import { AjaxOptions, GlobalAjaxOptions } from "../types/web/AjaxOptions";
import type { AjaxResponse } from "../types/web/AjaxResponse";
import { FetchAjax } from "./FetchAjax";
import { XHRAjax } from "./XHRAjax";
import { joinUrl, objectDeepMerge } from "../utils";
import { AjaxError } from "./AjaxError";
import type { Loading } from "../Loading";

/** 진행 중인 요청의 조회 정보입니다. 본문과 인증 헤더는 보관하지 않습니다. */
export interface PendingAjaxRequest {
  readonly id: number;
  readonly url: string;
  readonly method: string;
  readonly startedAt: number;
}

/**
 * Ajax 클래스
 */
export class Ajax {
  // Fetch 방식의 Ajax 객체
  private fetchAjax: FetchAjax;

  // XHR 방식의 Ajax 객체
  private xhrAjax: XHRAjax;

  // 브라우저에서 Fetch API 지원 여부
  private isFetchSupported: boolean;

  private options: GlobalAjaxOptions;
  private readonly pendingRequestMap = new Map<number, PendingAjaxRequest>();
  private nextRequestId = 0;

  /**
   * 진행 중인 요청의 스냅샷을 반환합니다. 동일 URL 요청도 별도 ID로 구분합니다.
   * @returns 진행 중인 요청 Map의 복사본
   */
  public get pendingRequests(): ReadonlyMap<number, PendingAjaxRequest> {
    return new Map(this.pendingRequestMap);
  }

  constructor(options?: GlobalAjaxOptions) {
    this.options = objectDeepMerge(this.createGlobalAjaxOptions(), options || {}, { _excludeKeys: ["signal", "params", "loaderContainer"] });
    // 배열은 병합하면 기본 허용 메서드가 남으므로 지정한 값으로 교체한다
    if (options?.validMethods) this.options.validMethods = options.validMethods.map(m => String(m).toUpperCase());
    this.options.signal = options?.signal;
    this.options.params = options?.params;
    this.options.loaderContainer = options?.loaderContainer;
    this.fetchAjax = new FetchAjax(this.options);
    this.xhrAjax = new XHRAjax(this.options);
    this.isFetchSupported = typeof window !== "undefined" && "fetch" in window;
  }

  /** 전역 옵션의 기본값을 만듭니다. 내부용이며 기존 호환을 위해 공개로 유지합니다. */
  createGlobalAjaxOptions(): GlobalAjaxOptions {
    return {
      baseUrl: "",
      method: "POST",
      timeout: -1,
      responseType: "json",
      headers: { "X-Client-Type": "Web" },
      loaderContainer: "",
      enableDefaultLoader: false,
      loaderOption: {},
      validMethods: ["GET", "POST", "PUT", "DELETE"],
      errorAlertView: false,
      fetchMode: "xhr",
    };
  }

  /** 요청 옵션의 기본값(전역 옵션 반영)을 만듭니다. 내부용이며 기존 호환을 위해 공개로 유지합니다. */
  createDefaultOptions(): AjaxOptions {
    const opts = this.options;
    return {
      url: "",
      signal: opts.signal,
      credentials: opts.credentials,
      params: opts.params,
      enableLoader: opts.enableLoader,
      showProgress: opts.showProgress,
      rawBody: opts.rawBody,
      fetchMode: opts.fetchMode,
      validateStatus: opts.validateStatus,
      paramsSerializer: opts.paramsSerializer,
      beforeRequest: opts.beforeRequest,
      beforeResponse: opts.beforeResponse,
      method: opts.method,
      timeout: opts.timeout,
      responseType: opts.responseType,
      headers: opts.headers,
      loaderContainer: opts.loaderContainer,
      loaderOption: opts.loaderOption,
      errorAlertView: opts.errorAlertView,
    };
  }

  /**
   * Ajax 인스턴스를 생성합니다.
   * @param {?AjaxOptions} [options]  ajax 옵션
   * @returns {Ajax} Ajax 인스턴스
   */
  public static create(options?: GlobalAjaxOptions): Ajax {
    return new Ajax(options);
  }

  // 두 signal 중 하나라도 취소되면 취소되는 signal 을 만든다. 하나뿐이면 그대로 사용한다.
  private combineSignals(a?: AbortSignal, b?: AbortSignal): { signal?: AbortSignal; dispose: () => void } {
    if (!a || !b || a === b) return { signal: a ?? b, dispose: () => {} };
    const controller = new AbortController();
    const first = a.aborted ? a : b.aborted ? b : null;
    if (first) {
      controller.abort((first as any).reason);
      return { signal: controller.signal, dispose: () => {} };
    }
    const onA = () => controller.abort((a as any).reason);
    const onB = () => controller.abort((b as any).reason);
    a.addEventListener("abort", onA, { once: true });
    b.addEventListener("abort", onB, { once: true });
    return {
      signal: controller.signal,
      dispose: () => {
        a.removeEventListener("abort", onA);
        b.removeEventListener("abort", onB);
      },
    };
  }

  private async _request(url: string, method?: string, options?: AjaxOptions, useFetch: boolean = true): Promise<any> {
    url = joinUrl(this.options.baseUrl, url);
    const data = options?.data;
    const opts = objectDeepMerge({ ...this.createDefaultOptions(), signal: undefined, params: undefined, loaderContainer: undefined }, options || {}, { _excludeKeys: ["data", "signal", "params", "loaderContainer"] });
    opts.data = data;
    opts.params = { ...this.options.params, ...options?.params };
    opts.loaderContainer = options?.loaderContainer ?? this.options.loaderContainer;

    const ajaxMethod = (method || opts.method || "GET").toUpperCase();

    if (!this.options.validMethods?.includes(ajaxMethod)) {
      return Promise.reject(
        new AjaxError({
          type: "method",
          status: 405,
          statusText: "Invalid Method",
          responseText: `Invalid HTTP method: ${ajaxMethod}`,
          message: `Invalid HTTP method: ${ajaxMethod}`,
          xhr: null,
          loadingInstance: null,
        })
      );
    }

    opts.loaderContainer = opts.enableLoader === false ? null : opts.loaderContainer || (opts.enableLoader === true || this.options.enableDefaultLoader ? "body" : null);

    // Fetch 는 업로드·다운로드 진행 이벤트를 제공하지 않으므로 진행 옵션과 함께 쓰면 XHR 를 쓰도록 오류로 알린다
    const usesFetch = useFetch && this.isFetchSupported && opts.fetchMode === "fetch";
    if (usesFetch && (opts.onUploadProgress || opts.onDownloadProgress || this.xhrAjax.needsLoaderProgress(opts, ajaxMethod))) {
      return Promise.reject(new TypeError('fetchMode "fetch" 는 onUploadProgress/onDownloadProgress/showProgress(파일 업로드·blob/arraybuffer 다운로드) 를 지원하지 않습니다. fetchMode: "xhr" 를 사용하세요.'));
    }

    const id = ++this.nextRequestId;
    this.pendingRequestMap.set(id, Object.freeze({ id, url, method: ajaxMethod, startedAt: Date.now() }));
    let loadingInstance: Loading | null = null;
    const beforeRequest = opts.beforeRequest;
    opts.beforeRequest = (value: AjaxOptions, xhr: XMLHttpRequest | null, loading?: Loading | null) => {
      loadingInstance = loading ?? null;
      beforeRequest?.(value, xhr, loading);
    };

    // 요청 signal 과 전역 signal 을 함께 적용한다
    const combined = this.combineSignals(options?.signal, this.options.signal);
    opts.signal = combined.signal;

    try {
      const response = await (usesFetch ? this.fetchAjax.request(url, ajaxMethod, opts) : this.xhrAjax.request(url, ajaxMethod, opts));
      loadingInstance = loadingInstance ?? (response as { loadingInstance?: Loading | null } | null)?.loadingInstance ?? null;
      return response;
    } catch (error: any) {
      loadingInstance = loadingInstance ?? error?.loadingInstance;
      throw error;
    } finally {
      combined.dispose();
      this.pendingRequestMap.delete(id);
      loadingInstance?.hide();
    }
  }

  /**
   * 요청을 보냅니다. URL 과 메서드는 options.url, options.method 로 지정합니다.
   *
   * @param {?AjaxOptions} [options]  ajax 옵션
   * @param {boolean} [useFetch=true] false 면 fetchMode 와 관계없이 XHR 을 사용합니다. true 여도 fetchMode 가 "fetch" 일 때만 Fetch 를 사용합니다(기본 fetchMode 는 "xhr").
   * @returns {*}
   */
  public request<T = any>(options?: AjaxOptions, useFetch: boolean = true): Promise<AjaxResponse<T>> {
    const url = options?.url || "";
    return this._request(url, options?.method, options, useFetch);
  }

  /**
   * get 요청을 보냅니다.
   *
   * @param {string} url api URL
   * @param {?AjaxOptions} [options]  ajax 옵션
   * @param {boolean} [useFetch=true] false 면 fetchMode 와 관계없이 XHR 사용
   * @returns {*}
   */
  public get<T = any>(url: string, options?: AjaxOptions, useFetch: boolean = true): Promise<AjaxResponse<T>> {
    return this._request(url, "GET", options, useFetch);
  }

  /**
   * post 요청을 보냅니다.
   *
   * @param {string} url api URL
   * @param {?AjaxOptions} [options]  ajax 옵션
   * @param {boolean} [useFetch=true] false 면 fetchMode 와 관계없이 XHR 사용
   * @returns {*}
   */
  public post<T = any>(url: string, options?: AjaxOptions, useFetch: boolean = true): Promise<AjaxResponse<T>> {
    return this._request(url, "POST", options, useFetch);
  }

  /**
   * put 요청을 보냅니다.
   *
   * @param {string} url api URL
   * @param {?AjaxOptions} [options]  ajax 옵션
   * @param {boolean} [useFetch=true] false 면 fetchMode 와 관계없이 XHR 사용
   * @returns {*}
   */
  public put<T = any>(url: string, options?: AjaxOptions, useFetch: boolean = true): Promise<AjaxResponse<T>> {
    return this._request(url, "PUT", options, useFetch);
  }

  /**
   * DELETE 요청을 보냅니다.
   *
   * @param {string} url api URL
   * @param {?AjaxOptions} [options]  ajax 옵션
   * @param {boolean} [useFetch=true] false 면 fetchMode 와 관계없이 XHR 사용
   * @returns {*}
   */
  public delete<T = any>(url: string, options?: AjaxOptions, useFetch: boolean = true): Promise<AjaxResponse<T>> {
    return this._request(url, "DELETE", options, useFetch);
  }
}
