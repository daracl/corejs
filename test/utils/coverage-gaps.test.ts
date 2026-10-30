import { debounce } from "../../src/utils/debounce";
import { addClass, removeClass, toggleClass, styleClassSplit, addStyleCss } from "../../src/common/dom/dom-style";
import { hasClass, resolveScrollElement, isPrimaryPointer, isEsc, isMouseMoved } from "../../src/utils/dom";
import { toObjectForm, getIn, setIn } from "../../src/utils/path";
import { sanitizeHtml } from "../../src/utils/sanitizeHtml";
import { trim, leftTrim, rightTrim, allTrim, matchCount, rightPad, capitalize, upperCase, lowerCase, xss, unXss, convertHtmlToText } from "../../src/utils/str";
import { compareValues, formatDate, formatValue, computeSummary, calcSummary } from "../../src/utils/data";
import { getPagingInfo } from "../../src/utils/paging";
import { sameValue } from "../../src/utils/objectUtils";
import { replaceParameter } from "../../src/utils/replaceParameter";
import { renderTemplate, toDataAttribute, assertScope, addValueIfMissing, getHashCode, isSameValue, camelToKebab, camelToUnderscore } from "../../src/utils/stringUtils";
import { writeClipboard, svgToDataURL, serializeSvg } from "../../src/utils/browser";
import { AjaxError } from "../../src/ajax/AjaxError";
import { XHRAjax } from "../../src/ajax/XHRAjax";
import { EventManager } from "../../src/common/event";

describe("debounce", () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it("마지막 호출의 this 와 인자로 지연 실행한다", () => {
    const calls: [string, number][] = [];
    const run = debounce<[number], { tag: string }>(function (value) { calls.push([this.tag, value]); }, 100);
    run.call({ tag: "x" }, 1);
    run.call({ tag: "y" }, 2);
    jest.advanceTimersByTime(99);
    expect(calls).toEqual([]);
    jest.advanceTimersByTime(1);
    expect(calls).toEqual([["y", 2]]);
  });

  it("cancel 은 대기 중인 호출을 취소하고, delay 가 1 미만이면 즉시 실행한다", () => {
    const callback = jest.fn();
    const delayed = debounce(callback, 50);
    delayed();
    delayed.cancel();
    jest.advanceTimersByTime(100);
    expect(callback).not.toHaveBeenCalled();

    const immediate = debounce(callback, 0);
    immediate();
    expect(callback).toHaveBeenCalledTimes(1);
  });
});

describe("dom-style / dom 헬퍼", () => {
  it("클래스 헬퍼는 빈 값과 문자열이 아닌 인자를 무시한다", () => {
    const el = document.createElement("div");
    expect(styleClassSplit("  a  b ")).toEqual(["a", "b"]);
    expect(() => addClass(null, "x")).not.toThrow();
    addClass(el, "");
    expect(el.className).toBe("");
    addClass(el, "a b");
    removeClass(el, 5 as unknown as string);
    expect(el.className).toBe("a b");
    removeClass(el, "a");
    toggleClass(el, "b c");
    expect(el.className).toBe("c");
    expect(() => toggleClass(null, "x")).not.toThrow();
    expect(() => removeClass(null, "x")).not.toThrow();
    expect(hasClass(el, "x c")).toBe(true);
    expect(hasClass(el, "x y")).toBe(false);
  });

  it("addStyleCss 는 자체 속성만 설정한다", () => {
    const el = document.createElement("div");
    addStyleCss(el, { "font-size": "12px", color: "red" });
    expect(el.style.fontSize).toBe("12px");
    expect(el.style.color).toBe("red");
  });

  it("resolveScrollElement: 잘못된 선택자는 자동 탐색으로 대체하고 스크롤 가능한 상위를 찾는다", () => {
    document.body.innerHTML = '<div id="scroll"><div id="inner"></div></div>';
    const scroll = document.getElementById("scroll")!;
    const inner = document.getElementById("inner")!;
    expect(() => resolveScrollElement(inner, "###[")).not.toThrow();
    expect(resolveScrollElement(inner, "###[")).toBeUndefined();
    expect(resolveScrollElement(inner, scroll)).toBe(scroll);
    expect(resolveScrollElement(inner, "#scroll")).toBe(scroll);
    expect(resolveScrollElement(inner, document.body)).toBeUndefined();
    scroll.style.overflowY = "auto";
    Object.defineProperty(scroll, "scrollHeight", { configurable: true, value: 500 });
    Object.defineProperty(scroll, "clientHeight", { configurable: true, value: 100 });
    expect(resolveScrollElement(inner)).toBe(scroll);
  });

  it("isPrimaryPointer·isEsc·isMouseMoved", () => {
    expect(isPrimaryPointer(new MouseEvent("mousedown", { button: 0 }))).toBe(true);
    expect(isPrimaryPointer(new MouseEvent("mousedown", { button: 2 }))).toBe(false);
    expect(isPrimaryPointer(new Event("keydown"))).toBe(false);
    class FakeTouchEvent extends Event {}
    (global as any).TouchEvent = FakeTouchEvent;
    try { expect(isPrimaryPointer(new FakeTouchEvent("touchstart"))).toBe(true); } finally { delete (global as any).TouchEvent; }
    expect(isEsc(new KeyboardEvent("keydown", { key: "Escape" }))).toBe(true);
    expect(isEsc(new KeyboardEvent("keydown", { key: "Esc" }))).toBe(true);
    expect(isEsc(new KeyboardEvent("keydown", { key: "a" }))).toBe(false);
    expect(isMouseMoved({ x: 0, y: 0 }, { x: 3, y: 4 })).toBe(false);
    expect(isMouseMoved({ x: 0, y: 0 }, { x: 4, y: 4 })).toBe(true);
  });
});

describe("path / sanitizeHtml", () => {
  it("toObjectForm 은 boolean·문자열 축약 옵션을 객체로 바꾼다", () => {
    expect(toObjectForm(true)).toEqual({ enabled: true });
    expect(toObjectForm("x", "name")).toEqual({ name: "x" });
    expect(toObjectForm("x")).toEqual({});
    const source = { a: 1 };
    expect(toObjectForm(source)).toEqual({ a: 1 });
    expect(toObjectForm(source)).not.toBe(source);
    expect(toObjectForm(null)).toEqual({});
  });

  it("setIn/getIn 은 위험한 경로를 거부하고 prune 으로 빈 객체를 정리한다", () => {
    const target: Record<string, unknown> = {};
    setIn(target, ["a", "b"], 1);
    expect(getIn(target, ["a", "b"])).toBe(1);
    setIn(target, ["a", "b"], undefined, { prune: true });
    expect(target).toEqual({});
    expect(() => setIn(target, ["__proto__", "x"], 1)).toThrow(TypeError);
    expect(() => setIn(target, [], 1)).toThrow(TypeError);
    expect(getIn(target, ["constructor"])).toBeUndefined();
  });

  it("sanitizeHtml 은 주석을 제거하고 허용하지 않는 태그는 내용만 남긴다", () => {
    const wrap = document.createElement("div");
    wrap.appendChild(sanitizeHtml("<!-- c --><section><p>a</p></section><script>x()</script>"));
    expect(wrap.innerHTML).toBe("<p>a</p>");
  });
});

describe("str / data / paging", () => {
  it("공백 제거·문자열 변환 함수", () => {
    expect([trim("  a b  "), leftTrim("  a "), rightTrim(" a  "), allTrim(" a b ")]).toEqual(["a b", "a ", " a", "ab"]);
    expect([capitalize("test"), upperCase(null as unknown as string), lowerCase("ABC"), rightPad("7", 3)]).toEqual(["Test", "", "abc", "700"]);
    expect([xss(""), xss("<a>"), unXss(xss("<'&\">")), unXss("")]).toEqual(["", "&lt;a&gt;", "<'&\">", ""]);
    expect([matchCount("", "a"), matchCount("aXa", "a"), matchCount("a.b", ".")]).toEqual([0, 2, 3]);
    expect([convertHtmlToText(null), convertHtmlToText("<p>a</p><br>b")]).toEqual(["", "a\n\nb"]);
  });

  it("compareValues 는 null 위치와 방향을 처리한다", () => {
    expect(compareValues(null, 1, true, true)).toBe(1);
    expect(compareValues(null, 1, false, true)).toBe(1);
    expect(compareValues(null, 1, true, false)).toBe(1);
    expect(compareValues(null, 1, false, false)).toBe(-1);
    expect(compareValues(undefined, null)).toBe(0);
    expect(compareValues(2, 10)).toBeLessThan(0);
    expect(compareValues("b", "a", false)).toBeLessThan(0);
  });

  it("formatDate·formatValue", () => {
    const date = new Date(2024, 0, 2, 3, 4, 5);
    expect(formatDate(date, "YYYY-MM-DD HH:mm:ss")).toBe("2024-01-02 03:04:05");
    expect(formatValue(date, { type: "date", format: "YYYY/MM/DD", prefix: "[", suffix: "]" })).toBe("[2024/01/02]");
    expect(formatValue("not a date", { type: "date" })).toBe("not a date");
    expect(formatValue(1234.5, { type: "number", format: "0,0.00" })).toBe("1,234.50");
    expect(formatValue("abc", { type: "number" })).toBe("abc");
    expect(formatValue(1234, { type: "currency", locale: "en-US", format: "USD" })).toBe("$1,234.00");
    expect([formatValue(null), formatValue(""), formatValue(5)]).toEqual(["", "", "5"]);
  });

  it("computeSummary·calcSummary", () => {
    const rows = [{ v: 1 }, { v: "x" }, { v: 5 }];
    expect(["sum", "average", "min", "max", "count"].map(mode => computeSummary(rows, "v", mode as "sum"))).toEqual([6, 3, 1, 5, 3]);
    expect(computeSummary([{ v: "x" }], "v", "sum")).toBeNull();
    expect(computeSummary(rows, "v", list => list.length * 10)).toBe(30);
    expect(calcSummary([{ v: 2 }, { v: 4 }], "avg", "v")).toBe(3);
    expect(calcSummary([], "bad", "v")).toBe("bad not valid");
    expect(calcSummary([], "sum", "v")).toBe("not valid");
  });

  it("getPagingInfo 는 모든 페이지에서 일관된 범위를 계산한다", () => {
    for (const [total, pageSize, unit] of [[1000, 10, 10], [95, 10, 5], [7, 10, 10], [101, 7, 4]] as const) {
      const pages = Math.ceil(total / pageSize);
      for (let page = 1; page <= pages + 2; page++) {
        const info = getPagingInfo(total, page, pageSize, unit);
        expect(info.totalPages).toBe(pages);
        expect(info.page).toBe(Math.min(page, pages));
        expect(info.currStartPage).toBeLessThanOrEqual(info.page);
        expect(info.currEndPage).toBeGreaterThanOrEqual(info.page);
        expect(info.currEndPage).toBeLessThanOrEqual(pages);
        expect(info.prePage_is).toBe(info.currStartPage !== 1);
        expect(info.nextPage_is).toBe(info.currEndPage !== pages);
        if (pages > unit) expect(info.currEndPage - info.currStartPage + 1).toBe(unit);
      }
    }
    expect(getPagingInfo(0, 3, 10, 10)).toMatchObject({ page: 0, totalPages: 0, currStartPage: 0 });
    expect(getPagingInfo(Number.NaN, Number.NaN, -1, 0)).toMatchObject({ totalPages: 0, pageSize: 10, unitPage: 10 });
  });
});

describe("objectUtils / replaceParameter / stringUtils", () => {
  it("sameValue 는 순환 참조를 비교한다", () => {
    const a: any = { x: 1 }; a.self = a;
    const b: any = { x: 1 }; b.self = b;
    const c: any = { x: 2 }; c.self = c;
    expect(sameValue(a, b)).toBe(true);
    expect(sameValue(a, c)).toBe(false);
    expect(sameValue([1, { a: undefined }], [1, {}])).toBe(true);
  });

  it("replaceParameter 는 객체 외 값을 모든 자리표시자에 쓰고 없는 키는 빈 문자열이다", () => {
    expect(replaceParameter("#a#-#b#", "x")).toBe("x-x");
    expect(replaceParameter("#a#|#b#|#c#", { a: null, c: { k: 1 } })).toBe('||{"k":1}');
    expect(replaceParameter("#toString#", {})).toBe("");
  });

  it("renderTemplate 의 비교 연산과 알 수 없는 조건", () => {
    const render = (condition: string, n: number) => renderTemplate(`{{if(${condition})}}Y{{/if}}`, { n });
    expect([render("n>=2", 2), render("n>2", 2), render("n<=2", 3), render("n<3", 2), render("n==2", 2), render("n!=2", 2)]).toEqual(["Y", "", "", "Y", "Y", ""]);
    expect(render("n > abc", 2)).toBe("");
    expect(renderTemplate("{{missing}}|{{n}}", { n: 0 })).toBe("|0");
  });

  it("문자열 변환·검증 헬퍼", () => {
    expect([camelToKebab("fooBar9Baz"), camelToUnderscore("fooBar")]).toEqual(["foo-bar9-baz", "foo_bar"]);
    expect([toDataAttribute("fooBar"), toDataAttribute("fooBar", ["foo-bar"]), toDataAttribute("1a")]).toEqual(["data-foo-bar", undefined, undefined]);
    expect(assertScope("my-scope")).toBe("my-scope");
    expect(() => assertScope("1bad scope")).toThrow("Invalid scope");
    expect(addValueIfMissing("a,b", "c")).toEqual(["a", "b", "c"]);
    expect(addValueIfMissing("a,b", "a", true)).toEqual(["b"]);
    expect(addValueIfMissing("a,x", "c", false, ",", ["a", "c"])).toEqual(["a", "c"]);
    expect(addValueIfMissing("a", null)).toEqual([]);
    expect([getHashCode(""), getHashCode("abc") === getHashCode("abc"), isSameValue(null, undefined), isSameValue(1, "1"), isSameValue(1, 2)]).toEqual([0, true, true, true, false]);
  });
});

describe("browser 헬퍼", () => {
  const originalExec = (document as any).execCommand;
  afterEach(() => {
    (document as any).execCommand = originalExec;
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: undefined });
    document.body.innerHTML = "";
  });

  it("writeClipboard: Clipboard API 성공, 실패 후 execCommand 대체, 모두 실패", async () => {
    const writeText = jest.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText } });
    await expect(writeClipboard("a")).resolves.toBe(true);
    expect(writeText).toHaveBeenCalledWith("a");

    writeText.mockRejectedValueOnce(new Error("denied"));
    (document as any).execCommand = jest.fn(() => true);
    await expect(writeClipboard("b")).resolves.toBe(true);
    expect((document as any).execCommand).toHaveBeenCalledWith("copy");
    expect(document.querySelector("textarea")).toBeNull();

    Object.defineProperty(navigator, "clipboard", { configurable: true, value: undefined });
    (document as any).execCommand = jest.fn(() => { throw new Error("blocked"); });
    await expect(writeClipboard("c")).resolves.toBe(false);
    expect(document.querySelector("textarea")).toBeNull();

    (document as any).execCommand = undefined;
    await expect(writeClipboard("d")).resolves.toBe(false);
  });

  it("svgToDataURL·serializeSvg", () => {
    expect(svgToDataURL("<svg/>")).toBe("data:image/svg+xml;charset=utf-8,%3Csvg%2F%3E");
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    expect(serializeSvg(svg)).toContain('xmlns="http://www.w3.org/2000/svg"');
    expect(svg.hasAttribute("xmlns")).toBe(false);
  });
});

describe("AjaxError 기본 메시지", () => {
  it("유형별 기본 메시지를 만든다", () => {
    const message = (type: ConstructorParameters<typeof AjaxError>[0]["type"], extra = {}) => new AjaxError({ type, ...extra }).message;
    expect(message("http", { status: 500 })).toBe("Request failed with status code 500");
    expect(message("timeout")).toBe("timeout exceeded");
    expect(message("abort")).toBe("Request aborted");
    expect(message("method")).toBe("Invalid HTTP method");
    expect(message("parse")).toBe("Failed to parse response body");
    expect(message("callback")).toBe("Request callback failed");
    expect(message("callback", { error: new Error("hook") })).toBe("hook");
    expect(message("network")).toBe("Network Error");
    expect(message("network", { error: new Error("offline") })).toBe("offline");
    expect(message("http", { message: "custom" })).toBe("custom");
  });
});

describe("AjaxAbstract.buildFormDataFromObject", () => {
  const build = (data: unknown): FormData => (new XHRAjax({}) as any).buildFormDataFromObject(data);

  it("중첩 객체·배열·날짜·null 을 폼 필드로 변환한다", () => {
    const file = new File(["x"], "a.txt");
    const file2 = new File(["y"], "b.txt");
    const form = build({
      user: { name: "kim", avatar: file },
      tags: ["x", "y"],
      list: [{ k: 1 }, new Date(0)],
      when: new Date(0),
      badDate: new Date(Number.NaN),
      n: 1,
      nil: null,
      none: undefined,
      meta: { a: 1 },
      files: [file, file2],
    });
    expect(form.get("user[name]")).toBe("kim");
    expect(form.get("user[avatar]")).toBe(file);
    expect(form.getAll("tags[]")).toEqual(["x", "y"]);
    expect(form.getAll("list[]")).toEqual(['{"k":1}', "1970-01-01T00:00:00.000Z"]);
    expect(form.get("when")).toBe("1970-01-01T00:00:00.000Z");
    expect(form.get("badDate")).toBe("Invalid Date");
    expect(form.get("n")).toBe("1");
    expect(form.has("nil")).toBe(false);
    expect(form.has("none")).toBe(false);
    expect(form.get("meta")).toBe('{"a":1}');
    expect(form.getAll("files[]")).toEqual([file, file2]);
  });

  it("객체가 아닌 값은 file 필드로 보낸다", () => {
    const file = new File(["x"], "a.txt");
    expect(build(file).get("file")).toBe(file);
  });
});

describe("EventManager 위임", () => {
  it("선택자에 맞는 하위 요소의 이벤트만 처리하고 false 반환 시 기본 동작을 막는다", () => {
    document.body.innerHTML = '<ul id="list"><li class="item"><b>a</b></li><li class="other">b</li></ul>';
    const manager = new EventManager();
    const calls: string[] = [];
    manager.on("#list", "click", (event: Event, matched: Element) => { calls.push(matched.className); return false; }, ".item");
    document.querySelector(".other")!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    expect(calls).toEqual([]);
    const inner = new MouseEvent("click", { bubbles: true, cancelable: true });
    document.querySelector(".item b")!.dispatchEvent(inner);
    expect(calls).toEqual(["item"]);
    expect(inner.defaultPrevented).toBe(true);
    manager.offAll();
  });
});
