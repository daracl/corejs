import { EventManager } from "../../src/common/event/event-manager";
import { addClass, removeClass, toggleClass } from "../../src/common/dom/dom-style";
import { Loading } from "../../src/Loading";

describe("DOM and event lifecycle", () => {
  afterEach(() => { document.body.innerHTML = ""; jest.useRealTimers(); });

  it.each(["selector", "nodeList", "array"])("removes all capture listeners registered through %s", mode => {
    document.body.innerHTML = '<button class="target"></button><button class="target"></button>';
    const elements = document.querySelectorAll(".target");
    const input = mode === "selector" ? ".target" : mode === "array" ? Array.from(elements) : elements;
    const manager = new EventManager();
    const listener = jest.fn();
    manager.on(input, " click.test ", listener, undefined, true);
    manager.on(input, "click.test", listener);
    elements[0].dispatchEvent(new MouseEvent("click"));
    expect(listener).toHaveBeenCalledTimes(2);
    manager.off(input, "click.test");
    elements[0].dispatchEvent(new MouseEvent("click"));
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it("keeps event managers independent and handles delegated text targets", () => {
    document.body.innerHTML = '<button>text</button>';
    const first = new EventManager();
    const second = new EventManager();
    const listener = jest.fn();
    first.on(document, "click", jest.fn());
    second.on(document, "click", listener, "button");
    first.offAll();
    document.querySelector("button")!.firstChild!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    expect(listener).toHaveBeenCalledTimes(1);
    second.offAll();
  });

  it("accepts empty class names without throwing", () => {
    const element = document.createElement("div");
    expect(() => { addClass(element, " "); removeClass(element, ""); toggleClass(element, "\t"); }).not.toThrow();
  });

  it("clears independent loading timers and restores container styles", () => {
    jest.useFakeTimers();
    const a = document.createElement("div");
    const b = document.createElement("div");
    document.body.append(a, b);
    const first = new Loading(a, { enableTime: true, timeout: 5000 });
    const second = new Loading(b, { enableTime: true });
    first.hide();
    expect(jest.getTimerCount()).toBe(1);
    second.hide();
    expect(jest.getTimerCount()).toBe(0);
    expect(a.style.position).toBe("");
    expect(b.style.position).toBe("");
  });

  it("does not let a previous timeout hide a newly shown loader", () => {
    jest.useFakeTimers();
    const loading = new Loading(document.body, { timeout: 1000 });
    loading.hide();
    jest.advanceTimersByTime(500);
    loading.show();
    jest.advanceTimersByTime(500);
    expect(document.querySelector(".daracl-cl")).not.toBeNull();
    loading.hide();
  });
});
