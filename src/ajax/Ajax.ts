import { AjaxOptions, GlobalAjaxOptions } from "@t/web/AjaxOptions";
import { FetchAjax } from "./FetchAjax";
import { XHRAjax } from "./XHRAjax";
import { objectDeepMerge } from "@/utils";
import type { Loading } from "@/Loading";

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
    this.options.signal = options?.signal;
    this.options.params = options?.params;
    this.options.loaderContainer = options?.loaderContainer;
    this.fetchAjax = new FetchAjax(this.options);
    this.xhrAjax = new XHRAjax(this.options);
    this.isFetchSupported = typeof window !== "undefined" && "fetch" in window;
  }

  createGlobalAjaxOptions(): GlobalAjaxOptions {
    return {
      baseUrl: "",
      method: "POST",
      timeout: -1,
      responseType: "json",
      headers: { "X-Requested-With": "XMLHttpRequest" },
      loaderContainer: "",
      enableDefaultLoader: false,
      loaderOption: {},
      validMethods: ["GET", "POST", "PUT", "DELETE"],
      errorAlertView: false,
      ignoreResultCheck: false,
      fetchMode: "xhr",
    };
  }

  createDefaultOptions(): AjaxOptions {
    const opts = this.options;
    return {
      url: "",
      signal: opts.signal,
      credentials: opts.credentials,
      params: opts.params,
      enableLoader: opts.enableLoader,
      fetchMode: opts.fetchMode,
      validateStatus: opts.validateStatus,
      beforeRequest: opts.beforeRequest,
      beforeResponse: opts.beforeResponse,
      method: opts.method,
      timeout: opts.timeout,
      responseType: opts.responseType,
      headers: opts.headers,
      loaderContainer: opts.loaderContainer,
      loaderOption: opts.loaderOption,
      errorAlertView: opts.errorAlertView,
      ignoreResultCheck: opts.ignoreResultCheck,
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

  private async _request(url: string, method?: string, options?: AjaxOptions, useFetch: boolean = true): Promise<any> {
    url = this.options.baseUrl ? this.options.baseUrl + url : url;
    const data = options?.data;
    const opts = objectDeepMerge({ ...this.createDefaultOptions(), signal: undefined, params: undefined, loaderContainer: undefined }, options || {}, { _excludeKeys: ["data", "signal", "params", "loaderContainer"] });
    opts.data = data;
    opts.signal = options?.signal ?? this.options.signal;
    opts.params = { ...this.options.params, ...options?.params };
    opts.loaderContainer = options?.loaderContainer ?? this.options.loaderContainer;

    const ajaxMethod = (method || opts.method || "GET").toUpperCase();

    if (!this.options.validMethods?.includes(ajaxMethod)) {
      return Promise.reject({
        type: "http",
        status: 405,
        readyState: 0,
        statusText: "Invalid Method",
        responseText: `Invalid HTTP method: ${ajaxMethod}`,
        xhr: null,
        loadingInstance: null,
      });
    }

    opts.loaderContainer = opts.enableLoader === false ? null : opts.loaderContainer ||
      (opts.enableLoader === true || this.options.enableDefaultLoader ? "body" : null);

    const id = ++this.nextRequestId;
    this.pendingRequestMap.set(id, Object.freeze({ id, url, method: ajaxMethod, startedAt: Date.now() }));
    let loadingInstance: Loading | null = null;
    const beforeRequest = opts.beforeRequest;
    opts.beforeRequest = (value: AjaxOptions, xhr: XMLHttpRequest | null, loading?: Loading | null) => {
      loadingInstance = loading ?? null;
      beforeRequest?.(value, xhr, loading);
    };

    try {
      const response = await (useFetch && this.isFetchSupported && opts.fetchMode === "fetch"
        ? this.fetchAjax.request(url, ajaxMethod, opts)
        : this.xhrAjax.request(url, ajaxMethod, opts));
      loadingInstance = loadingInstance ?? (response as { loadingInstance?: Loading | null } | null)?.loadingInstance ?? null;
      return response;
    } catch (error: any) {
      loadingInstance = loadingInstance ?? error?.loadingInstance;
      throw error;
    } finally {
      this.pendingRequestMap.delete(id);
      loadingInstance?.hide();
    }
  }

  /**
   * 요청을 보냅니다.
   *
   * @param {string} url api URL
   * @param {?AjaxOptions} [options]  ajax 옵션
   * @param {boolean} [useFetch=true] Fetch API 사용 여부
   * @returns {*}
   */
  public request(options?: AjaxOptions, useFetch: boolean = true): Promise<any> {
    const url = options?.url || "";
    return this._request(url, options?.method, options, useFetch);
  }

  /**
   * get 요청을 보냅니다.
   *
   * @param {string} url api URL
   * @param {?AjaxOptions} [options]  ajax 옵션
   * @param {boolean} [useFetch=true] Fetch API 사용 여부
   * @returns {*}
   */
  public get(url: string, options?: AjaxOptions, useFetch: boolean = true): Promise<any> {
    return this._request(url, "GET", options, useFetch);
  }

  /**
   * post 요청을 보냅니다.
   *
   * @param {string} url api URL
   * @param {?AjaxOptions} [options]  ajax 옵션
   * @param {boolean} [useFetch=true] Fetch API 사용 여부
   * @returns {*}
   */
  public post(url: string, options?: AjaxOptions, useFetch: boolean = true): Promise<any> {
    return this._request(url, "POST", options, useFetch);
  }

  /**
   * put 요청을 보냅니다.
   *
   * @param {string} url api URL
   * @param {?AjaxOptions} [options]  ajax 옵션
   * @param {boolean} [useFetch=true] Fetch API 사용 여부
   * @returns {*}
   */
  public put(url: string, options?: AjaxOptions, useFetch: boolean = true): Promise<any> {
    return this._request(url, "PUT", options, useFetch);
  }

  /**
   * DELETE 요청을 보냅니다.
   *
   * @param {string} url api URL
   * @param {?AjaxOptions} [options]  ajax 옵션
   * @param {boolean} [useFetch=true] Fetch API 사용 여부
   * @returns {*}
   */
  public delete(url: string, options?: AjaxOptions, useFetch: boolean = true): Promise<any> {
    return this._request(url, "DELETE", options, useFetch);
  }
}
