import {Ajax} from "./Ajax";
import * as Utils from "./utils";
import * as dom from "./common/dom";
import * as event from "./common/event";
import * as message from "./common/message";  

// 2) 브라우저 전역에 등록 (데모 실행용)
declare global {
  interface Window {
    Daracl?: any;
  }
}

if (typeof window !== "undefined") {
  window.Daracl = window.Daracl || {};
  window.Daracl.ajax=Ajax;
  window.Daracl.utils=Utils;
  window.Daracl.core = {
    dom:dom,
    event:event,
    messaage : message,  
  }
}