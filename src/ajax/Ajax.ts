import { AjaxOptions } from "@t/web/AjaxOptions";
import { FetchAjax } from "./FetchAjax";
import { XHRAjax } from "./XHRAjax";
import { deepMerge } from "@/utils";

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

  private options: AjaxOptions;

  constructor(options?: AjaxOptions) {
    this.options = deepMerge({}, this.createDefaultOptions(), options || {});
    this.fetchAjax = new FetchAjax(this.options);
    this.xhrAjax = new XHRAjax(this.options);
    this.isFetchSupported =  typeof window !== "undefined" && "fetch" in window;
  }

  createDefaultOptions(): AjaxOptions {
    return {
      baseUrl: "",
      url: "",
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
    };
  }

  /**
   * Ajax 인스턴스를 생성합니다.
   * @param {?AjaxOptions} [options]  ajax 옵션
   * @returns {Ajax} Ajax 인스턴스
   */ 
  public static create(options?: AjaxOptions): Ajax {
    return new Ajax(options);
  }

  private _request(url: string, method?: string, options?: AjaxOptions, useFetch: boolean = true) {
    const opts = deepMerge({}, this.options, options || {});

    const ajaxMethod = (method || opts.method || "GET").toUpperCase();

    if(!this.options.validMethods?.includes(ajaxMethod)){
      return Promise.reject(
          {
            type: "http",
            status: 405,
            readyState : 0,
            statusText: 'Invalid Method',
            responseText:`Invalid HTTP method: ${ajaxMethod}`,
            xhr: null,
            loadingInstance:null,
          }
        );
    }

    console.log('1111111', url, ajaxMethod, opts);
    
    opts.loaderContainer = opts.loaderContainer || (opts.enableDefaultLoader ? this.options.loaderContainer || "body" : null);

    return this.isFetchSupported && useFetch
      ? this.fetchAjax.request(url, ajaxMethod, opts)
      : this.xhrAjax.request(url, ajaxMethod, opts);
  }

  /**
   * 요청을 보냅니다.
   *
   * @param {string} url api URL
   * @param {?AjaxOptions} [options]  ajax 옵션
   * @param {boolean} [useFetch=true] Fetch API 사용 여부
   * @returns {*} 
   */
  request(options?: AjaxOptions, useFetch: boolean = true) {
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
  get(url: string, options?: AjaxOptions, useFetch: boolean = true) {
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
  post(url: string, options?: AjaxOptions, useFetch: boolean = true) {
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
  put(url: string, options?: AjaxOptions, useFetch: boolean = true) {
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
  delete(url: string, options?: AjaxOptions, useFetch: boolean = true) {
    return this._request(url, "DELETE", options, useFetch);
  }
}
