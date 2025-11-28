import { AjaxOptions } from "@t/web/AjaxOptions";
import { deepMerge, hasProperty, isObject } from "./utils";
import { objectToQueryString } from "./utils/objectToQueryString";

import { Loading } from "./Loading";
import { ajaxCallback } from "@t/callbackFunction";


/**
 * Ajax 컨트롤
 *
 * @class Ajax
 * @typedef {Ajax}
 */
export class Ajax {
  private options;
  constructor(options: any) {
    this.options = deepMerge({}, this.createDefaultOptions(), options) as AjaxOptions;
  }

  createDefaultOptions = (): AjaxOptions => ({
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
    enableDefaultLoader: true,
    loaderOption: {},
  });


  /**
   * ajax request
   *
   * @public
   * @param {AjaxOptions} options
   * @returns {CustomPromise}
   */
  public request(options: AjaxOptions) {
    return this.ajax(options?.url||"", options.method, options);
  }

  /**
   * ajax get
   *
   * @public
   * @param {string} url
   * @param {AjaxOptions} options
   * @returns {CustomPromise}
   */
  public get(url: string, options?: AjaxOptions) {
    return this.ajax(url, "get", options);
  }

  /**
   * ajax post
   *
   * @public
   * @param {string} url
   * @param {AjaxOptions} options
   * @returns {CustomPromise}
   */
  public post(url: string, options?: AjaxOptions) {
    return this.ajax(url, "post", options);
  }

  /**
   * ajax put
   *
   * @public
   * @param {string} url
   * @param {AjaxOptions} options
   * @returns {CustomPromise}
   */
  public put(url: string, options?: AjaxOptions) {
    return this.ajax(url, "put", options);
  }

  /**
   * ajax delete
   *
   * @public
   * @param {string} url
   * @param {AjaxOptions} options
   * @returns {CustomPromise}
   */
  public delete(url: string, options?: AjaxOptions) {
    return this.ajax(url, "delete", options);
  }

  private ajax(url: string, method: string, options?: AjaxOptions) {
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

export class CustomPromise {
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
