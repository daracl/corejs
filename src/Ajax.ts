import { AjaxOptions } from "@t/web/AjaxOptions";
import { deepMerge, hasProperty, isObject } from "./utils";
import { objectToQueryString } from "./utils/objectToQueryString";

import Loading from "@daracl/loading";
import { ajaxCallback } from "@t/callbackFunction";

let defaultOptions: AjaxOptions = {
  // 기본 url
  baseUrl: "",

  url: "",
  // ajax method
  method: "POST",
  // ajax time out
  timeout: -1,
  ignoreResultCheck: false,

  async: true,

  errorAlertView: true,
  // response type
  responseType: "json",
  // ajax header
  headers: { "X-Requested-With": "XMLHttpRequest" },
  // 로딩 이미지 보여줄 container // selector, html element
  loaderContainer: "",
  // 기본 로더 사용여부
  enableDefaultLoader: true,
  loaderOption: {},
};

/**
 * Ajax 컨트롤
 *
 * @class Ajax
 * @typedef {Ajax}
 */
export class Ajax {
  private options;
  constructor(options: any) {
    this.options = deepMerge({}, defaultOptions, options) as AjaxOptions;
  }

  public static create(opts: AjaxOptions) {
    return new Ajax(opts);
  }

  public static setOptions(opts: AjaxOptions) {
    defaultOptions = deepMerge(defaultOptions, opts) as AjaxOptions;
  }

  public static getOptions(): AjaxOptions {
    return defaultOptions;
  }

  public static instance = new Ajax(defaultOptions);

  /**
   * ajax request
   *
   * @public
   * @param {AjaxOptions} options
   * @returns {CustomPromise}
   */
  public request(options: any) {
    return this.ajax(options.url, options, options.method);
  }

  /**
   * ajax get
   *
   * @public
   * @param {string} url
   * @param {AjaxOptions} options
   * @returns {CustomPromise}
   */
  public get(url: string, options?: any) {
    return this.ajax(url, options, "get");
  }

  /**
   * ajax post
   *
   * @public
   * @param {string} url
   * @param {AjaxOptions} options
   * @returns {CustomPromise}
   */
  public post(url: string, options?: any) {
    return this.ajax(url, options, "post");
  }

  /**
   * ajax put
   *
   * @public
   * @param {string} url
   * @param {AjaxOptions} options
   * @returns {CustomPromise}
   */
  public put(url: string, options?: any) {
    return this.ajax(url, options, "put");
  }

  /**
   * ajax delete
   *
   * @public
   * @param {string} url
   * @param {AjaxOptions} options
   * @returns {CustomPromise}
   */
  public delete(url: string, options?: any) {
    return this.ajax(url, options, "delete");
  }

  private ajax(url: string, options: AjaxOptions, method: string) {
    const opts = deepMerge({}, this.options, options) as AjaxOptions;

    opts.method = method ?? "get";

    url = opts.baseUrl + url;

    return new CustomPromise((resolve, reject) => {
      const xhr = new XMLHttpRequest();

      // 처리할것
      let loadingInstance: Loading = new Loading(opts.loaderContainer, opts.loaderOption);

      if (opts.enableDefaultLoader !== false && opts.loaderContainer) {
        if (opts.loaderContainer instanceof HTMLElement) {
          const loaderOption = opts.loaderOption;
          if (loaderOption.enableCancelButton === true) {
            if (loaderOption.callback) {
              const loaderCallback = loaderOption.callback;
              loaderOption.callback = () => {
                if (loaderCallback(options) === false) {
                  return false;
                }
                xhr.abort();
                return true;
              };
            }
          }
          loadingInstance = new Loading(opts.loaderContainer, opts.loaderOption);
        }
      }

      if (opts.beforeRequest) {
        opts.beforeRequest.call(null, options, xhr, loadingInstance);
      }

      xhr.open(opts.method, this.getUrlWithData(url, opts), opts.async === false ? false : true);
      if (opts.timeout > -1) {
        xhr.timeout = opts.timeout;
      }

      this.setHeaders(xhr, opts);

      xhr.addEventListener(
        "readystatechange",
        () => {
          if (xhr.readyState === xhr.DONE) {
            if (xhr.status >= 200 && xhr.status < 300) {
              resolve(this.parseResponse(xhr, opts), xhr, loadingInstance);
            } else {
              reject(new Error(`Request failed with status ${xhr.status}`), xhr, loadingInstance);
            }
          }
        },
        false
      );

      xhr.onerror = function () {
        reject(new Error("Network error"), xhr, loadingInstance);
      };

      if (isObject(opts.data)) {
        xhr.send(JSON.stringify(opts.data));
      } else {
        xhr.send();
      }
    });
  }

  private parseResponse(xhr: XMLHttpRequest, opts: AjaxOptions) {
    const reponseText = xhr.responseText;
    let result = reponseText;

    if (opts.responseType == "json") {
      try {
        result = JSON.parse(reponseText);
      } catch (e) {
        result = (e as any).message;
      }
    }
    return {
      data: result,
      status: xhr.status,
      responseText: reponseText,
      config: opts,
      headers: this.getResponseHeaders(xhr),
    };
  }

  /**
   * response header
   *
   * @param xhr {XMLHttpRequest} ajax obj
   * @returns {Object} header 정보
   */
  private getResponseHeaders(xhr: XMLHttpRequest) {
    const allHeaders = xhr.getAllResponseHeaders();

    // 헤더를 객체로 변환하기 (선택 사항)
    const headersObj: Record<string, string> = {};
    const headersArray = allHeaders.trim().split(/[\r\n]+/);
    headersArray.forEach((line) => {
      const parts = line.split(": ");
      const header = parts.shift();
      const value = parts.join(": ");
      if (header) {
        headersObj[header] = value;
      }
    });

    return headersObj;
  }

  private getUrlWithData(url: string, options: AjaxOptions): string {
    if (options.method.toLowerCase() !== "get" || !options.data) {
      return url;
    }
    const dataAsQueryString = objectToQueryString(options.data);
    const queryStringSeparator = url.indexOf("?") > -1 ? "&" : "?";
    return url + queryStringSeparator + dataAsQueryString;
  }

  private setHeaders(xhr: XMLHttpRequest, options: AjaxOptions) {
    const headers = options.headers || {};
    if (!hasProperty(headers, "Content-Type")) {
      headers["Content-Type"] = isObject(options.data) ? "application/json" : "application/x-www-form-urlencoded";
    }

    Object.keys(headers).forEach(function (name) {
      headers[name] && xhr.setRequestHeader(name, headers[name]);
    });
  }
}

class CustomPromise {
  private onResolve: ajaxCallback;
  private onReject: ajaxCallback;
  private onFinally: (xhr: XMLHttpRequest, loadingInstance: Loading) => void;
  private isFulfilled = false;
  private isRejected = false;
  private resolveValue!: any;
  private rejectReason: any;
  private xhr: XMLHttpRequest;

  constructor(executor: (resolve: ajaxCallback, reject: ajaxCallback) => void) {
    const resolve = (value: any, xhr: XMLHttpRequest, loadingInstance: Loading) => {
      this.isFulfilled = true;
      this.resolveValue = value;
      this.xhr = xhr;

      if (this.onResolve) {
        this.onResolve(value, xhr, loadingInstance);
      }
      if (this.onFinally) {
        this.onFinally(xhr, loadingInstance);
      }
    };

    const reject = (reason: any, xhr: XMLHttpRequest, loadingInstance: Loading) => {
      this.isRejected = true;
      this.rejectReason = reason;
      this.xhr = xhr;
      if (this.onReject) {
        this.onReject(reason, xhr, loadingInstance);
      }
      if (this.onFinally) {
        this.onFinally(xhr, loadingInstance);
      }
    };

    executor(resolve, reject);
  }

  then(callback: (value: any, xhr: XMLHttpRequest) => void): CustomPromise {
    if (this.isFulfilled) {
      callback(this.resolveValue, this.xhr);
    } else {
      this.onResolve = callback;
    }
    return this;
  }

  catch(callback: (reason: any, xhr: XMLHttpRequest) => void): CustomPromise {
    if (this.isRejected) {
      callback(this.rejectReason, this.xhr);
    } else {
      this.onReject = callback;
    }
    return this;
  }

  finally(callback: (xhr: XMLHttpRequest) => void): CustomPromise {
    if (this.isFulfilled || this.isRejected) {
      callback(this.xhr);
    } else {
      this.onFinally = callback;
    }
    return this;
  }
}
