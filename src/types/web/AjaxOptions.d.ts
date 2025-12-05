import { ajaxCallback } from "@t/callbackFunction";


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
  loaderOption?: any;
  validMethods?: string[];
  beforeRequest?: ajaxCallback;
  beforeResponse?: ajaxCallback;
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
  loaderOption?: any;
  beforeRequest?: ajaxCallback;
  beforeResponse?: ajaxCallback;
}
