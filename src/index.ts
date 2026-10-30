
export * from "./ajax/Ajax";
export * from "./ajax/AjaxError";
export type { AjaxOptions, GlobalAjaxOptions } from "./types/web/AjaxOptions";
export type { AjaxResponse } from "./types/web/AjaxResponse";
export type { LoadingOptions } from "./types/LoadingOptions";
export * from "./Loading";
// dist/utils.js(유틸 번들)와 dist/utils/(선언 폴더)의 이름이 겹쳐 "./utils" 는 선언 파일로 해석되지 않으므로 index 를 명시한다
export * from "./utils/index";
export * from "./common/dom";
export * from "./common/event";
export * from "./common/message";

declare const APP_VERSION: string;

export const VERSION = `${APP_VERSION}`

import "../style/daracl.scss";

import "./global";