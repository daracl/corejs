
export * from "./ajax/Ajax";
export type { AjaxOptions, GlobalAjaxOptions } from "./types/web/AjaxOptions";
export type { LoadingOptions } from "./types/LoadingOptions";
export * from "./Loading";
export * from "./utils";
export * from "./common/dom";
export * from "./common/event";
export * from "./common/message";

declare const APP_VERSION: string;

export const VERSION = `${APP_VERSION}`

import "../style/daracl.scss";

import "./global";