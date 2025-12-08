import { ajaxCallback } from "@t/callbackFunction";
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
  fetchMode?: "fetch"|"xhr";
}



export interface AjaxOptions {
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
