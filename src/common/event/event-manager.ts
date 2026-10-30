import { $querySelectorList } from "../dom/dom-utils";

type Registration = { type: string; handler: EventListener; capture: boolean };

/** "click.ns1.ns2" 를 이벤트 이름과 네임스페이스 목록으로 나눕니다. */
function parseEventType(type: string): { name: string; namespaces: string[] } {
  const [name, ...namespaces] = type.split(".");
  return { name, namespaces: namespaces.filter(Boolean) };
}

/** 제거할 대상(off 의 type)이 등록된 이벤트와 일치하는지 검사합니다. 이름이나 네임스페이스를 생략하면 와일드카드입니다. */
function matchesEventType(target: { name: string; namespaces: string[] }, registered: { name: string; namespaces: string[] }): boolean {
  if (target.name && target.name !== registered.name) return false;
  return target.namespaces.every(namespace => registered.namespaces.includes(namespace));
}

/**
 * 이벤트 등록을 관리합니다.
 * 등록 정보는 요소를 약하게 참조하므로 off 없이 DOM 에서 제거된 요소는 메모리에서 해제될 수 있고,
 * offAll 은 아직 살아 있는 요소의 리스너를 모두 제거합니다.
 */
export class EventManager {
  private registrations = new WeakMap<Node, Registration[]>();
  private targets = new Set<{ deref(): Node | undefined }>();
  private refs = new WeakMap<Node, { deref(): Node | undefined }>();
  // 요소가 GC 되면 offAll 이 순회할 목록에서도 해당 약한 참조를 지운다
  private finalizer = typeof FinalizationRegistry === "function" ? new FinalizationRegistry<{ deref(): Node | undefined }>(ref => { this.targets.delete(ref); }) : undefined;

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
        this.track(target);
      }
    }
  }

  /**
   * 등록한 이벤트를 제거합니다. "click" 은 네임스페이스와 관계없이 click 을 모두 제거하고,
   * "click.ns" 는 해당 네임스페이스만, ".ns" 는 이벤트 이름과 관계없이 해당 네임스페이스를 제거합니다.
   */
  public off(el: Element | string | NodeList | null | Document | Element[], type: string) {
    if (el == null) return el;
    const types = type.trim().split(/\s+/).filter(Boolean).map(parseEventType);
    for (const target of $querySelectorList(el)) {
      const remaining = (this.registrations.get(target) ?? []).filter(entry => {
        const registered = parseEventType(entry.type);
        if (!types.some(item => matchesEventType(item, registered))) return true;
        target.removeEventListener(registered.name, entry.handler, entry.capture);
        return false;
      });
      if (remaining.length) this.registrations.set(target, remaining);
      else this.untrack(target);
    }
  }

  public offAll(): void {
    for (const ref of this.targets) {
      const target = ref.deref();
      if (!target) continue;
      for (const entry of this.registrations.get(target) ?? []) {
        target.removeEventListener(entry.type.split(".")[0], entry.handler, entry.capture);
      }
      this.registrations.delete(target);
      this.refs.delete(target);
      this.finalizer?.unregister(ref);
    }
    this.targets.clear();
  }

  // offAll 이 순회할 요소 목록을 약한 참조로 보관한다(WeakRef 가 없으면 강한 참조로 대체)
  private track(target: Node): void {
    if (this.refs.has(target)) return;
    const weak = typeof WeakRef === "function";
    const ref = weak ? new WeakRef(target) : { deref: () => target };
    this.refs.set(target, ref);
    this.targets.add(ref);
    if (weak) this.finalizer?.register(target, ref, ref);
  }

  private untrack(target: Node): void {
    this.registrations.delete(target);
    const ref = this.refs.get(target);
    if (ref) {
      this.targets.delete(ref);
      this.finalizer?.unregister(ref);
    }
    this.refs.delete(target);
  }
}
