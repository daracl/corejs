import { isBlank, isString, isNil } from "@/utils";
import { $querySelectorList } from "../dom/dom-utils";


type Listener = (event: Event, target?: Element) => any;

interface EventStore {
  [eventType: string]: Listener;
}

const EVENT_HANDLER_MAP = new WeakMap<any, EventStore>();
const REGISTERED_ELEMENTS = new Set<any>();

export class EventManager {

 /**
 * html element event 등록
 *
 * @param {(Element | string | NodeList | null | Document)} el html element
 * @param {string} type event type "click mousedown" space split
 * @param {?*} [listener] 이벤트 리스너
 * @param {?*} [selector] 상위 셀럭터
 * @param {?*} [fnOpts] listener option
 * @returns {*}
 */
 public on(el: Element | string | NodeList | null | Document | Element[], type: string, listener?: any, selector?: any, fnOpts?: any) {
  if (el == null) return;

  const eventTypes = type.replaceAll(/\s+/g, " ").split(" ");

  const elements = $querySelectorList(el);

  let fn: any;
  if (!isBlank(selector) && isString(selector)) {
    fn = (e: Event) => {
      const evtTarget = e.target as Element;
      const selectorEle = evtTarget.closest(selector);

      if (!selectorEle) return;

      let containsFlag = false;
      for (const el of elements) {
        if (el.contains(selectorEle)) {
          containsFlag = true;
        }
      }

      if (!containsFlag) return;

      if (listener(e, selectorEle) === false) {
        e.stopImmediatePropagation();
        e.preventDefault();
      }
    };
  } else {
    fn = (e: Event) => {
      if (listener(e, el) === false) {
        e.stopImmediatePropagation();
        e.preventDefault();
      }
    };
  }

  for (const eventType of eventTypes) {
    addEventInfo(el, eventType, fn);
    const event = eventType.split(".")[0];
    elements.forEach((el: Node) => {
      el.addEventListener(event, fn, fnOpts ?? {});
    });
  }
};


/**
 * html element event 등록
 *
 * @param {(Element | string | NodeList | null | Document)} el html element
 * @param {string} type event type "click mousedown" space split
 * @returns {*}
 */
public off(el: Element | string | NodeList | null | Document | Element[], type: string) {
  if (el == null) return el;

  const eventTypes = type.replaceAll(/\s+/g, " ").split(" ");

  const elements = $querySelectorList(el);

  // 각 요소별로 WeakMap에서 이벤트 정보를 읽어와 제거
  for (const eventType of eventTypes) {
    const event = eventType.split(".")[0];
    elements.forEach((target) => {
      const elementEvents = EVENT_HANDLER_MAP.get(target);
      if (isNil(elementEvents) || isNil(elementEvents[eventType])) {
        return;
      }

      target.removeEventListener(event, elementEvents[eventType]);
      delete elementEvents[eventType];

      if (Object.keys(elementEvents).length < 1) {
        EVENT_HANDLER_MAP.delete(target);
      }
    });
  }
};


  offAll(): void {
    // WeakMap은 iterable이 아니므로 따로 저장한 Set을 순회해서 정리
    for (const element of Array.from(REGISTERED_ELEMENTS)) {
      const events = EVENT_HANDLER_MAP.get(element);
      if (!events) {
        REGISTERED_ELEMENTS.delete(element);
        continue;
      }

      Object.keys(events).forEach(ev => this.off(element, ev));

      // 완전 정리
      REGISTERED_ELEMENTS.delete(element);
      EVENT_HANDLER_MAP.delete(element);
    }
  }
}


/** 내부 util */
function addEventInfo(el: any, type: string, handler: Listener) {
  if (!EVENT_HANDLER_MAP.has(el)) {
    EVENT_HANDLER_MAP.set(el, {});
    REGISTERED_ELEMENTS.add(el);
  }
  EVENT_HANDLER_MAP.get(el)![type] = handler;
}

