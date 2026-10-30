import { readFileSync } from "fs";
import { createMatcher } from "../../src/utils/data";
import { isRiskyRegex } from "../../src/utils/regex";
import { matchCount, escapeHTML } from "../../src/utils/str";
import { formatMessage } from "../../src/common/message";
import { parseClipboard } from "../../src/utils/clipboard";
import { insertToArray } from "../../src/utils/array";
import { removeAttr } from "../../src/common/dom";
import { EventManager } from "../../src/common/event";
import { getURLParams, getURLParam } from "../../src/utils/getURLParams";
import { sanitizeHtml } from "../../src/utils/sanitizeHtml";
import { popup } from "../../src/utils/popup";
import { downloadText } from "../../src/utils/browser";
import { Loading } from "../../src/Loading";

describe("정규식 검색 방어", () => {
  it("역추적 위험 패턴을 감지한다", () => {
    for (const pattern of ["(a+)+$", "(a|a)*b", "(a*)*", "a*a*a*a*b", "(.)\\1", "(\\d+)*x"]) expect(isRiskyRegex(pattern)).toBe(true);
    expect(isRiskyRegex("a{1,}a{1,}a{1,}a{1,}b")).toBe(true);
    expect(isRiskyRegex("(a{1,})+")).toBe(true);
    expect(isRiskyRegex("a{1,}a{1,}b")).toBe(false);
    for (const pattern of ["^a.+z$", "\\d+\\s*\\w+", "[a-z]+@[a-z]+\\.com", "(ab)+c", "a{2,5}b", "[+*]+"]) expect(isRiskyRegex(pattern)).toBe(false);
  });

  it("위험한 정규식은 리터럴로 검색해 오래 걸리지 않는다", () => {
    const started = Date.now();
    const matcher = createMatcher("a*a*a*a*a*a*b", { useRegex: true });
    expect(matcher("a".repeat(5000))).toBe(false);
    expect(matcher("x a*a*a*a*a*a*b y")).toBe(true);
    expect(matchCount("a".repeat(5000), "a*a*a*a*a*a*b")).toBe(0);
    expect(Date.now() - started).toBeLessThan(1000);
  });

  it("정규식은 반복 개수별 텍스트 길이 상한을 넘으면 리터럴로 검색한다", () => {
    // 반복이 없는 패턴은 10000자, 2개는 1000자, 3개는 200자까지만 정규식을 적용한다
    const simple = createMatcher("^a", { useRegex: true });
    expect(simple("abc")).toBe(true);
    expect(simple("b".repeat(10001) + "^a")).toBe(true);
    expect(simple("a" + "b".repeat(10001))).toBe(false);

    const three = createMatcher("^a*a*a*b", { useRegex: true });
    expect(three("aab")).toBe(true);
    expect(three("a".repeat(300) + "^a*a*a*b")).toBe(true);
  });

  it("3개 반복 패턴도 상한 안에서는 오래 걸리지 않고, 상한을 넘으면 리터럴이라 즉시 끝난다", () => {
    // 상한(200자) 안의 일치 실패는 네제곱 비용이지만 수십 ms 수준이다. 부하가 있는 환경을 고려해 임계값은 넉넉히 둔다.
    const started = Date.now();
    expect(createMatcher("a*a*a*b", { useRegex: true })("a".repeat(120))).toBe(false);
    expect(matchCount("a".repeat(120), "a*a*a*b")).toBe(0);
    // 상한을 넘는 텍스트는 정규식을 적용하지 않으므로 길이와 무관하게 빠르다(적용했다면 분 단위)
    expect(matchCount("a".repeat(5000), "a*a*a*b")).toBe(0);
    expect(createMatcher("a*a*a*b", { useRegex: true })("a".repeat(5000))).toBe(false);
    expect(Date.now() - started).toBeLessThan(10000);
  });

  it("허용된 단순 정규식은 계속 동작한다", () => {
    expect(createMatcher("^a.+z$", { useRegex: true })("abz")).toBe(true);
    expect(matchCount("a1b22c333", "\\d+")).toBe(3);
  });
});

describe("문자열·메시지", () => {
  it("escapeHTML 은 작은따옴표도 이스케이프한다", () => {
    expect(escapeHTML(`<a href='x' title="y">&`)).toBe("&lt;a href=&#39;x&#39; title=&#34;y&#34;&gt;&amp;");
  });

  it("formatMessage 는 Object.prototype 기본 속성을 치환하지 않는다", () => {
    expect(formatMessage("{constructor} {toString} {name}", { name: "A" })).toBe("{constructor} {toString} A");
    expect(formatMessage("{toString}", { toString: "own" })).toBe("own");
  });
});

describe("배열·클립보드", () => {
  it("parseClipboard 는 줄바꿈으로 끝나도 빈 행을 만들지 않는다", () => {
    expect(parseClipboard("a\tb\n")).toEqual([["a", "b"]]);
    expect(parseClipboard("a\tb\r\nc\td\r\n")).toEqual([["a", "b"], ["c", "d"]]);
    expect(parseClipboard("a\tb\n\n")).toEqual([["a", "b"]]);
    expect(parseClipboard("a\t\n")).toEqual([["a", ""]]);
    expect(parseClipboard("")).toEqual([[""]]);
    expect(parseClipboard('"x\ny"\n')).toEqual([["x\ny"]]);
  });

  it("insertToArray 는 범위를 벗어난 위치를 배열 범위로 보정한다", () => {
    expect(insertToArray([1, 2, 3], 9, true, 0)).toEqual([9, 1, 2, 3]);
    expect(insertToArray([1, 2, 3], 9, true, 1)).toEqual([9, 1, 2, 3]);
    expect(insertToArray([1, 2, 3], 9, false, 99)).toEqual([1, 2, 3, 9]);
    expect(insertToArray([1, 2, 3], 9, false, -5)).toEqual([9, 1, 2, 3]);
    expect(insertToArray([1, 2, 3], 9, false, Number.NaN)).toEqual([1, 2, 3, 9]);
  });
});

describe("DOM·이벤트", () => {
  it("removeAttr 는 SVG·배열·NodeList·null 을 처리한다", () => {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("a", "1");
    removeAttr(svg, "a");
    expect(svg.hasAttribute("a")).toBe(false);

    document.body.innerHTML = '<p a="1" b="2"></p><p a="1" b="2"></p>';
    removeAttr(document.querySelectorAll("p"), "a");
    removeAttr(Array.from(document.querySelectorAll("p")), "b");
    expect(document.querySelectorAll("[a],[b]").length).toBe(0);
    expect(() => removeAttr(null, "a")).not.toThrow();
  });

  describe("EventManager", () => {
    const fire = (el: Element) => el.dispatchEvent(new Event("click"));

    it("off('click') 은 네임스페이스 핸들러도 제거하고 다른 이벤트는 유지한다", () => {
      const manager = new EventManager();
      const el = document.createElement("div");
      const calls: string[] = [];
      manager.on(el, "click.a", () => { calls.push("a"); });
      manager.on(el, "click.b", () => { calls.push("b"); });
      manager.on(el, "mouseenter", () => { calls.push("enter"); });
      manager.off(el, "click");
      fire(el);
      el.dispatchEvent(new Event("mouseenter"));
      expect(calls).toEqual(["enter"]);
    });

    it("off('click.ns') 는 해당 네임스페이스만, off('.ns') 는 모든 이벤트의 네임스페이스를 제거한다", () => {
      const manager = new EventManager();
      const el = document.createElement("div");
      const calls: string[] = [];
      manager.on(el, "click.a", () => { calls.push("click.a"); });
      manager.on(el, "click.b", () => { calls.push("click.b"); });
      manager.on(el, "mouseenter.a", () => { calls.push("enter.a"); });
      manager.off(el, "click.a");
      fire(el);
      expect(calls).toEqual(["click.b"]);
      manager.off(el, ".b");
      manager.off(el, ".a");
      fire(el);
      el.dispatchEvent(new Event("mouseenter"));
      expect(calls).toEqual(["click.b"]);
    });

    it("offAll 은 등록한 모든 핸들러를 제거하고 다시 등록할 수 있다", () => {
      const manager = new EventManager();
      const el = document.createElement("div");
      let count = 0;
      manager.on(el, "click", () => { count++; });
      manager.offAll();
      fire(el);
      expect(count).toBe(0);
      manager.on(el, "click", () => { count++; });
      fire(el);
      expect(count).toBe(1);
      manager.offAll();
    });
  });
});

describe("URL·HTML", () => {
  it("getURLParams 는 상대 URL 을 문서 기준으로 해석한다", () => {
    expect(getURLParams("/a?b=1&b=2")).toEqual({ b: ["1", "2"] });
    expect(getURLParam("page?x=3", "x")).toBe("3");
  });

  it("sanitizeHtml 은 화면을 덮는 position 스타일을 제거한다", () => {
    const wrap = document.createElement("div");
    wrap.appendChild(sanitizeHtml('<p style="position: fixed; top:0">a</p><p style="POSITION:absolute">b</p><p style="color: red">c</p>'));
    const [fixed, absolute, plain] = Array.from(wrap.querySelectorAll("p"));
    expect(fixed.hasAttribute("style")).toBe(false);
    expect(absolute.hasAttribute("style")).toBe(false);
    expect(plain.getAttribute("style")).toBe("color: red");
  });
});

describe("popup / downloadText / package", () => {
  afterEach(() => { jest.restoreAllMocks(); jest.useRealTimers(); });

  it("현재 창을 이동시키는 예약 이름은 거부한다", () => {
    jest.spyOn(window, "open").mockReturnValue({ focus: jest.fn() } as unknown as Window);
    for (const name of ["_self", "_top", "_PARENT"]) expect(() => popup("/page", { name })).toThrow(TypeError);
    expect(window.open).not.toHaveBeenCalled();
    expect(() => popup("/page", { name: "_blank" })).not.toThrow();
  });

  it("다른 출처의 URL 은 opener 를 끊고, 같은 출처는 유지하며, noopener 로 직접 정할 수 있다", () => {
    const opened = (): Window => ({ focus: jest.fn(), opener: window } as unknown as Window);
    const open = jest.spyOn(window, "open");
    open.mockReturnValueOnce(opened());
    expect(popup("https://other.example/page")!.opener).toBeNull();
    open.mockReturnValueOnce(opened());
    expect(popup("/page")!.opener).toBe(window);
    open.mockReturnValueOnce(opened());
    expect(popup("/page", { noopener: true })!.opener).toBeNull();
    open.mockReturnValueOnce(opened());
    expect(popup("https://other.example/page", { noopener: false })!.opener).toBe(window);
  });

  it("downloadText 는 다운로드가 시작될 시간을 주고 object URL 을 해제한다", () => {
    jest.useFakeTimers();
    const revoke = jest.fn();
    Object.defineProperty(URL, "createObjectURL", { configurable: true, value: jest.fn(() => "blob:test") });
    Object.defineProperty(URL, "revokeObjectURL", { configurable: true, value: revoke });
    jest.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
    downloadText("a.txt", "x");
    jest.advanceTimersByTime(1000);
    expect(revoke).not.toHaveBeenCalled();
    jest.advanceTimersByTime(10000);
    expect(revoke).toHaveBeenCalledWith("blob:test");
  });

  it("package.json 의 ./umd 는 import·require·default 를 모두 제공한다", () => {
    const pkg = JSON.parse(readFileSync("package.json", "utf8"));
    expect(pkg.exports["./umd"]).toEqual({ import: expect.any(String), require: expect.any(String), default: expect.any(String) });
    expect(Object.keys(pkg).filter(key => key.startsWith("editor.") || key.startsWith("["))).toEqual([]);
  });
});

describe("Loading 입력 처리", () => {
  beforeEach(() => { document.body.innerHTML = '<div id="t"></div>'; });
  afterEach(() => { document.body.innerHTML = ""; });

  it("옵션 값으로 속성이나 태그를 주입할 수 없다", () => {
    const loading = new Loading("#t", {
      loadingImg: 'x.gif" onerror="alert(1)',
      bgColor: 'red;"><script id="injected"></script>',
      cursor: 'wait" data-x="1',
      theme: 'dark" onclick="alert(1)' as never,
    });
    const root = document.querySelector(".daracl-cl")!;
    const image = root.querySelector("img")!;
    expect(image.getAttribute("src")).toBe('x.gif" onerror="alert(1)');
    expect(image.hasAttribute("onerror")).toBe(false);
    expect(root.hasAttribute("data-x")).toBe(false);
    expect(root.hasAttribute("onclick")).toBe(false);
    expect(root.getAttribute("data-loading-theme")).toBe("auto");
    expect(document.getElementById("injected")).toBeNull();
    loading.hide();
  });

  it("안전하지 않은 loadingImg 는 스피너로 대체하고 data:image 와 상대 경로는 허용한다", () => {
    new Loading("#t", { loadingImg: "javascript:alert(1)" }).hide();
    new Loading("#t", { loadingImg: " JaVa\tScript:alert(1)" }).hide();
    const unsafe = new Loading("#t", { loadingImg: "javascript:alert(1)" });
    expect(document.querySelector(".daracl-cl img")).toBeNull();
    expect(document.querySelector(".daracl-cl-spinner")).not.toBeNull();
    unsafe.hide();

    const safe = new Loading("#t", { loadingImg: "data:image/gif;base64,R0lGOD" });
    expect(document.querySelector(".daracl-cl img")?.getAttribute("src")).toBe("data:image/gif;base64,R0lGOD");
    safe.hide();
  });

  it("content 는 정리해서 표시한다", () => {
    const loading = new Loading("#t", { content: '<b>ok</b><img src="x" onerror="alert(1)"><script id="injected2"></script>' });
    const content = document.querySelector(".daracl-cl-content")!;
    expect(content.querySelector("b")?.textContent).toBe("ok");
    expect(content.querySelector("img")?.hasAttribute("onerror")).toBe(false);
    expect(document.getElementById("injected2")).toBeNull();
    loading.setContent("<i onclick=\"x()\">42%</i>");
    expect(document.querySelector(".daracl-cl-content i")?.textContent).toBe("42%");
    expect(document.querySelector(".daracl-cl-content i")?.hasAttribute("onclick")).toBe(false);
    loading.hide();
  });
});
