import {Ajax} from "./ajax/Ajax";
import * as utils from "./utils";
import {Loading} from "./Loading";
import * as dom from "./common/dom";
import * as event from "./common/event";
import * as message from "./common/message";  

declare global {
  interface Window {
    Daracl?: any;
  }
}

declare const APP_VERSION: string;

if (typeof window !== "undefined") {
  window.Daracl = window.Daracl || {};
  window.Daracl.VERSION = `${APP_VERSION}`;
  window.Daracl.ajax=Ajax;
  window.Daracl.utils=utils;
  window.Daracl.loading=Loading;
  
  window.Daracl.core = {
    dom:dom,
    event:event,
    messaage : message,  
  }
}