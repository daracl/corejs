export interface OptionCallback {
  (obj: object): any;
}

interface ajaxCallback {
  (value: any, xhr: XMLHttpRequest, loadingInstance?: Loading): void;
}
