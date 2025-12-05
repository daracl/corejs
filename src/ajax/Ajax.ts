import { AjaxOptions, GlobalAjaxOptions } from "@t/web/AjaxOptions";
import { FetchAjax } from "./FetchAjax";
import { XHRAjax } from "./XHRAjax";
import { objectDeepMerge } from "@/utils";

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

  constructor(options?: GlobalAjaxOptions) {
    this.options = objectDeepMerge(this.createGlobalAjaxOptions(), options || {});
    this.fetchAjax = new FetchAjax(this.options);
    this.xhrAjax = new XHRAjax(this.options);
    this.isFetchSupported =  typeof window !== "undefined" && "fetch" in window;
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
    };
  }

  createDefaultOptions(): AjaxOptions {
    
    return {
      url: "",
      method: this.options.method,
      timeout: this.options.timeout,
      responseType: this.options.responseType,
      headers: this.options.headers,
      loaderContainer: "",
      loaderOption: {},
      errorAlertView: this.options.errorAlertView,
      ignoreResultCheck: this.options.ignoreResultCheck,
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

  private _request(url: string, method?: string, options?: AjaxOptions, useFetch: boolean = true): Promise<any> {
    url = this.options.baseUrl ? this.options.baseUrl + url : url;
    const data = options?.data;
    const opts = objectDeepMerge(this.createDefaultOptions(), options || {}, {_excludeKeys:["data"]});
    opts.data = data;

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
