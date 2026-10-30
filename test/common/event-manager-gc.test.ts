import { EventManager } from "../../src/common/event";
import { Loading } from "../../src/Loading";

describe("EventManager 약한 참조 정리", () => {
  const originalRegistry = (global as any).FinalizationRegistry;
  afterEach(() => { (global as any).FinalizationRegistry = originalRegistry; });

  /** FinalizationRegistry 를 대체해 등록/해제 내역과 GC 콜백을 직접 제어한다 */
  function stubRegistry() {
    const state = { callbacks: [] as ((held: unknown) => void)[], registered: [] as unknown[], unregistered: [] as unknown[] };
    (global as any).FinalizationRegistry = class {
      constructor(callback: (held: unknown) => void) { state.callbacks.push(callback); }
      register(_target: unknown, held: unknown) { state.registered.push(held); }
      unregister(token: unknown) { state.unregistered.push(token); }
    };
    return state;
  }

  it("요소가 GC 되면 콜백이 offAll 순회 목록에서 약한 참조를 지운다", () => {
    const state = stubRegistry();
    const manager = new EventManager();
    manager.on(document.createElement("div"), "click", () => {});
    expect((manager as any).targets.size).toBe(1);
    expect(state.registered.length).toBe(1);
    state.callbacks[0](state.registered[0]);
    expect((manager as any).targets.size).toBe(0);
  });

  it("off 로 모두 제거하면 목록과 해제 등록을 함께 정리한다", () => {
    const state = stubRegistry();
    const manager = new EventManager();
    const el = document.createElement("div");
    manager.on(el, "click.a", () => {});
    manager.on(el, "click.b", () => {});
    expect((manager as any).targets.size).toBe(1);
    expect(state.registered.length).toBe(1);
    manager.off(el, "click.a");
    expect((manager as any).targets.size).toBe(1);
    manager.off(el, "click");
    expect((manager as any).targets.size).toBe(0);
    expect(state.unregistered).toEqual(state.registered);
  });

  it("offAll 도 해제 등록을 정리하고 FinalizationRegistry 가 없어도 동작한다", () => {
    const state = stubRegistry();
    const manager = new EventManager();
    manager.on(document.createElement("div"), "click", () => {});
    manager.offAll();
    expect(state.unregistered).toEqual(state.registered);
    expect((manager as any).targets.size).toBe(0);

    (global as any).FinalizationRegistry = undefined;
    const fallback = new EventManager();
    const el = document.createElement("div");
    let count = 0;
    fallback.on(el, "click", () => { count++; });
    fallback.offAll();
    el.dispatchEvent(new Event("click"));
    expect(count).toBe(0);
  });
});

describe("Loading 잘못된 선택자", () => {
  it("예외를 던지지 않고 컨테이너를 찾지 못한 것처럼 동작한다", () => {
    document.body.innerHTML = "";
    expect(() => {
      const loading = new Loading("###invalid[");
      loading.setContent("x");
      loading.setRequestCount(2);
      loading.hide();
    }).not.toThrow();
    expect(document.querySelector(".daracl-cl")).toBeNull();
  });
});
