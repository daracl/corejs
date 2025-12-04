import { ajaxCallback } from "@t/callbackFunction";

export interface AjaxOptions {
  baseUrl?: string;
  url?: string;
  method?: string;
  responseType?: string;
  async?: boolean;
  data?: any;
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
