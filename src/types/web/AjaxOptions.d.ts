import { ajaxCallback, OptionCallback } from "../callbackFunction";
import { LoadingOptions } from "../LoadingOptions";


export interface GlobalAjaxOptions {
  baseUrl?: string;
  method?: string;
  responseType?: string;
  timeout?: number;
  ignoreResultCheck?: boolean;
  errorAlertView?: boolean;
  headers?: any;
  enableDefaultLoader?: boolean;
  loaderContainer?: string | HTMLElement;
  loaderOption?: LoadingOptions;
  validMethods?: string[];
  beforeRequest?: ajaxCallback;
  beforeResponse?: ajaxCallback;
  /** External cancellation; never aborted by the library. */
  signal?: AbortSignal;
  /** XHR supports same-origin/include; omit requires fetch. */
  credentials?: RequestCredentials;
  /** Query parameters for any HTTP method. GET data remains supported. */
  params?: Record<string, unknown>;
  /** false disables the loader even when globally enabled. */
  enableLoader?: boolean;
  /** Override the instance transport for this request. */
  fetchMode?: "fetch" | "xhr";
  /** Defaults to HTTP 200-299. */
  validateStatus?: (status: number) => boolean;

}



export interface AjaxOptions {
  /** External cancellation; never aborted by the library. */
  signal?: AbortSignal;
  /** XHR supports same-origin/include; omit requires fetch. */
  credentials?: RequestCredentials;
  /** Query parameters for any HTTP method. GET data remains supported. */
  params?: Record<string, unknown>;
  /** false disables the loader even when globally enabled. */
  enableLoader?: boolean;
  /** Override the instance transport for this request. */
  fetchMode?: "fetch" | "xhr";
  /** Defaults to HTTP 200-299. */
  validateStatus?: (status: number) => boolean;
  url?: string;
  method?: string;
  responseType?: string;
  async?: boolean;
  data?: any;
  timeout?: number;
  ignoreResultCheck?: boolean;
  errorAlertView?: boolean;
  headers?: any;
  loaderContainer?: string | HTMLElement;
  loaderOption?: LoadingOptions;
  beforeRequest?: ajaxCallback;
  beforeResponse?: ajaxCallback;
  onUploadProgress?: OptionCallback;
  onDownloadProgress?: OptionCallback;
}
