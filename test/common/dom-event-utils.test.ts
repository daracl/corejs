import { $querySelector, $querySelectorList, before, after, prepend, append, findClosest, getElementRect } from "../../src/common/dom/dom-utils";
import { addAttr, eqAttributeValue, removeAttr } from "../../src/common/dom/dom-attribute";
import { addClass, removeClass, toggleClass } from "../../src/common/dom/dom-style";
import { keyboardEventKey, eventKeyCode, isShiftKey, isCtrlKey, isSpacebar, isEnter } from "../../src/common/event/keyboard-utils";
import { eventPosition, isClickEvent, stopPreventCancel } from "../../src/common/event/pointer-utils";

describe("DOM 선택자", () => {
  beforeEach(() => { document.body.innerHTML = '<div id="a"><span class="x"></span></div><div id="b"></div>'; });

  it("$querySelectorList 는 배열에서 노드가 아닌 항목을 제외한 새 배열을 반환한다", () => {
    const a = document.getElementById("a")!;
    const input = [null, a, undefined, "text", 3, {}, document.body] as unknown[];
    const result = $querySelectorList(input as Element[]);
    expect(result).toEqual([a, document.body]);
    expect(result).not.toBe(input);
    expect(input).toHaveLength(7);
  });

  it("$querySelectorList 는 선택자·Element·Document·NodeList·빈 값을 처리한다", () => {
    expect($querySelectorList("div")).toHaveLength(2);
    expect($querySelectorList(document.getElementById("a"))).toHaveLength(1);
    expect($querySelectorList(document)).toEqual([document]);
    expect($querySelectorList(document.querySelectorAll("div"))).toHaveLength(2);
    for (const empty of ["", "   ", null, undefined]) expect($querySelectorList(empty)).toEqual([]);
    expect($querySelectorList({} as unknown as Element)).toEqual([]);
  });

  it("$querySelector 는 대상이 없으면 항상 null 이다", () => {
    expect($querySelector([])).toBeNull();
    expect($querySelector([null] as unknown as Element[])).toBeNull();
    expect($querySelector(document.querySelectorAll(".none"))).toBeNull();
    expect($querySelector("#none")).toBeNull();
    expect($querySelector("")).toBeNull();
    expect($querySelector(null)).toBeNull();
    expect($querySelector({} as unknown as Element)).toBeNull();
  });

  it("$querySelector 는 첫 번째 Element 또는 Document 를 반환한다", () => {
    const a = document.getElementById("a")!;
    expect($querySelector([null, a] as unknown as Element[])).toBe(a);
    expect($querySelector(document.createTextNode("t") as unknown as Element)).toBeNull();
    expect($querySelector([document.createTextNode("t"), a] as unknown as Element[])).toBe(a);
    expect($querySelector(document.querySelectorAll("div"))).toBe(a);
    expect($querySelector("#a")).toBe(a);
    expect($querySelector(document)).toBe(document);
  });

  it("스타일 헬퍼는 배열에 섞인 null 에서 예외를 던지지 않는다", () => {
    const a = document.getElementById("a")!;
    expect(() => addClass([null, a] as unknown as Element[], "on")).not.toThrow();
    expect(a.classList.contains("on")).toBe(true);
    toggleClass([undefined, a] as unknown as Element[], "on");
    expect(a.classList.contains("on")).toBe(false);
    addClass(a, "x y");
    removeClass([null, a] as unknown as Element[], "x");
    expect(a.className).toBe("y");
  });
});

describe("DOM 삽입", () => {
  beforeEach(() => { document.body.innerHTML = '<div id="a"><span class="x"></span></div><div id="b"></div>'; });

  it("문자열 HTML 을 모든 대상의 네 위치에 삽입한다", () => {
    const a = document.getElementById("a")!;
    append("#a, #b", "<i class='n'></i>");
    prepend("#a", "<i class='p'></i>");
    before("#a", "<hr class='bf'>");
    after("#a", "<hr class='af'>");
    expect(document.querySelectorAll(".n")).toHaveLength(2);
    expect(a.firstElementChild?.className).toBe("p");
    expect(a.previousElementSibling?.className).toBe("bf");
    expect(a.nextElementSibling?.className).toBe("af");
  });

  it("Element 를 여러 대상에 넣으면 첫 대상은 이동하고 나머지는 복제한다", () => {
    const element = document.createElement("em");
    element.className = "m";
    prepend(document.querySelectorAll("div"), element);
    expect(document.querySelectorAll("div > .m")).toHaveLength(2);
    expect(document.getElementById("a")!.firstElementChild).toBe(element);
  });

  it("부모가 없는 요소의 앞·뒤 삽입은 문자열·Element 모두 조용히 건너뛴다", () => {
    const detached = document.createElement("div");
    expect(() => before(detached, "<p></p>")).not.toThrow();
    expect(() => after(detached, "<p></p>")).not.toThrow();
    expect(() => before(detached, document.createElement("p"))).not.toThrow();
    expect(() => after(detached, document.createElement("p"))).not.toThrow();
    expect(detached.parentNode).toBeNull();
    // 안쪽 삽입은 부모가 없어도 가능하다
    append(detached, "<p></p>");
    prepend(detached, document.createElement("b"));
    expect(detached.innerHTML).toBe("<b></b><p></p>");
  });

  it("문서 노드가 부모인 요소의 앞·뒤와 Element 가 아닌 대상은 건너뛴다", () => {
    expect(() => before(document.documentElement, "<p></p>")).not.toThrow();
    expect(() => after(document, "<p></p>")).not.toThrow();
    expect(() => append(document.createTextNode("t") as unknown as Element, "<p></p>")).not.toThrow();
    expect(document.querySelectorAll("p")).toHaveLength(0);
  });

  it("findClosest 와 getElementRect", () => {
    const a = document.getElementById("a")!;
    const span = a.querySelector(".x")!;
    expect(findClosest(span, "#a")).toBe(a);
    expect(findClosest(span, a)).toBe(a);
    expect(findClosest(span, document.getElementById("b")!)).toBeNull();
    expect(findClosest(null as unknown as Element, "#a")).toBeNull();
    expect(getElementRect(a)).toEqual({ top: 0, left: 0, bottom: 0, right: 0, width: 0, height: 0 });
    expect(() => getElementRect(null as unknown as Element)).toThrow("유효하지 않은 요소");
    Object.defineProperty(window, "scrollY", { configurable: true, value: 40 });
    try { expect(getElementRect(a, true).top).toBe(40); } finally { Object.defineProperty(window, "scrollY", { configurable: true, value: 0 }); }
  });
});

describe("속성", () => {
  it("addAttr 는 null·undefined 값을 건너뛰고 나머지는 문자열로 설정한다", () => {
    const div = document.createElement("div");
    addAttr(div, { a: 1, b: null, c: undefined, d: "", e: false, f: 0 });
    expect(div.getAttribute("a")).toBe("1");
    expect(div.hasAttribute("b")).toBe(false);
    expect(div.hasAttribute("c")).toBe(false);
    expect(div.getAttribute("d")).toBe("");
    expect(div.getAttribute("e")).toBe("false");
    expect(div.getAttribute("f")).toBe("0");
  });

  it("eqAttributeValue 와 removeAttr", () => {
    const div = document.createElement("div");
    div.setAttribute("a", "1");
    expect(eqAttributeValue(div, "a", "1")).toBe(true);
    expect(eqAttributeValue(div, "none", "null")).toBe(false);
    removeAttr(div, "a", "none");
    expect(div.hasAttribute("a")).toBe(false);
  });
});

describe("키보드 헬퍼", () => {
  it("키·키 코드·보조키를 읽는다", () => {
    const event = new KeyboardEvent("keydown", { key: "A", code: "KeyA", shiftKey: true });
    expect(keyboardEventKey(event)).toBe("a");
    expect(keyboardEventKey(new KeyboardEvent("keydown"))).toBe("");
    expect(isShiftKey(event)).toBe(true);
    expect(isCtrlKey(event)).toBe(false);
    expect(isCtrlKey(new KeyboardEvent("keydown", { ctrlKey: true }))).toBe(true);
  });

  it("isShiftKey·isCtrlKey 는 키보드가 아닌 이벤트에서도 boolean 이다", () => {
    for (const event of [new Event("click"), new MouseEvent("click"), new CustomEvent("x")]) {
      expect(isShiftKey(event)).toBe(false);
      expect(isCtrlKey(event)).toBe(false);
    }
    expect(isShiftKey(new MouseEvent("click", { shiftKey: true }))).toBe(true);
  });

  it("eventKeyCode 는 keyCode → which 순으로 읽고 없으면 undefined 다", () => {
    expect(eventKeyCode(new KeyboardEvent("keydown", { keyCode: 65 }))).toBe(65);
    const withWhich = Object.assign(new Event("keydown"), { which: 13 });
    expect(eventKeyCode(withWhich)).toBe(13);
    expect(eventKeyCode(new Event("keydown"))).toBeUndefined();
  });

  it("isSpacebar·isEnter 는 key 또는 code 로 판정한다", () => {
    expect(isSpacebar(new KeyboardEvent("keydown", { key: " " }))).toBe(true);
    expect(isSpacebar(new KeyboardEvent("keydown", { code: "Space" }))).toBe(true);
    expect(isSpacebar(new KeyboardEvent("keydown", { key: "a" }))).toBe(false);
    expect(isEnter(new KeyboardEvent("keydown", { key: "Enter" }))).toBe(true);
    expect(isEnter(new KeyboardEvent("keydown", { code: "Enter" }))).toBe(true);
    expect(isEnter(new KeyboardEvent("keydown", { key: "a" }))).toBe(false);
  });
});

describe("포인터 헬퍼", () => {
  it("eventPosition 은 마우스 좌표를 읽고 그 외 이벤트는 0,0 이다", () => {
    expect(eventPosition(new MouseEvent("click", { clientX: 5, clientY: 6 }))).toEqual({ x: 5, y: 6 });
    expect(eventPosition(new Event("x"))).toEqual({ x: 0, y: 0 });
  });

  it("eventPosition 은 TouchEvent 의 touches 가 비면 changedTouches 를 쓴다", () => {
    const touch = { pageX: 7, pageY: 8 };
    class FakeTouchEvent extends Event {
      touches: unknown[];
      changedTouches: unknown[];
      constructor(touches: unknown[], changed: unknown[]) { super("touchend"); this.touches = touches; this.changedTouches = changed; }
    }
    (global as any).TouchEvent = FakeTouchEvent;
    try {
      expect(eventPosition(new FakeTouchEvent([], [touch]) as unknown as Event)).toEqual({ x: 7, y: 8 });
      expect(eventPosition(new FakeTouchEvent([{ pageX: 1, pageY: 2 }], [touch]) as unknown as Event)).toEqual({ x: 1, y: 2 });
      expect(eventPosition(new FakeTouchEvent([], []) as unknown as Event)).toEqual({ x: 0, y: 0 });
    } finally {
      delete (global as any).TouchEvent;
    }
  });

  it("isClickEvent 는 왼쪽 버튼 마우스와 touchstart 만 클릭으로 본다", () => {
    expect(isClickEvent(new MouseEvent("click"))).toBe(true);
    expect(isClickEvent(new MouseEvent("mousedown", { button: 2 }))).toBe(false);
    expect(isClickEvent(new MouseEvent("mousedown", { button: 1 }))).toBe(false);
    expect(isClickEvent(new Event("touchstart"))).toBe(true);
    expect(isClickEvent(new KeyboardEvent("keydown"))).toBe(false);
  });

  it("stopPreventCancel 은 기본 동작과 전파를 막는다", () => {
    const event = new Event("click", { cancelable: true, bubbles: true });
    const parent = jest.fn();
    document.body.addEventListener("click", parent);
    const child = document.createElement("div");
    document.body.appendChild(child);
    child.addEventListener("click", stopPreventCancel);
    child.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
    expect(parent).not.toHaveBeenCalled();
    document.body.removeEventListener("click", parent);
    child.remove();
  });
});
