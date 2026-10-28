import { $querySelectorList } from "../dom/dom-utils";

type Registration = { type: string; handler: EventListener; capture: boolean };

export class EventManager {
  private registrations = new Map<Node, Registration[]>();

  public on(el: Element | string | NodeList | null | Document | Element[], type: string, listener?: any, selector?: any, fnOpts?: any) {
    if (el == null || typeof listener !== "function") return;
    for (const target of $querySelectorList(el)) {
      for (const eventType of type.trim().split(/\s+/).filter(Boolean)) {
        const handler: EventListener = (event) => {
          let matched: Element | undefined;
          if (typeof selector === "string" && selector.trim()) {
            const origin = event.target instanceof Element ? event.target : (event.target as Node | null)?.parentElement;
            matched = origin?.closest(selector) ?? undefined;
            if (!matched || !target.contains(matched)) return;
          }
          if (listener(event, matched ?? target) === false) {
            event.stopImmediatePropagation();
            event.preventDefault();
          }
        };
        const capture = typeof fnOpts === "boolean" ? fnOpts : !!fnOpts?.capture;
        target.addEventListener(eventType.split(".")[0], handler, fnOpts);
        const entries = this.registrations.get(target) ?? [];
        entries.push({ type: eventType, handler, capture });
        this.registrations.set(target, entries);
      }
    }
  }

  public off(el: Element | string | NodeList | null | Document | Element[], type: string) {
    if (el == null) return el;
    const types = new Set(type.trim().split(/\s+/));
    for (const target of $querySelectorList(el)) {
      const remaining = (this.registrations.get(target) ?? []).filter(entry => {
        if (!types.has(entry.type)) return true;
        target.removeEventListener(entry.type.split(".")[0], entry.handler, entry.capture);
        return false;
      });
      if (remaining.length) this.registrations.set(target, remaining);
      else this.registrations.delete(target);
    }
  }

  public offAll(): void {
    for (const [target, entries] of this.registrations) {
      for (const entry of entries) {
        target.removeEventListener(entry.type.split(".")[0], entry.handler, entry.capture);
      }
    }
    this.registrations.clear();
  }
}
