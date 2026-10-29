import { unXss, convertHtmlToText, matchCount, isNumeric, isEmpty, createHTMLElement } from "../../src/utils";
import { eventPosition } from "../../src/common/event";
import { append } from "../../src/common/dom";

describe("개선 사항 회귀 테스트", () => {
  it("unXss는 &amp;lt;를 이중 해제하지 않는다", () => {
    expect(unXss("&amp;lt;b&amp;gt;")).toBe("&lt;b&gt;");
    expect(unXss("&lt;a&gt;&amp;&quot;&#39;")).toBe("<a>&\"'");
  });

  it("convertHtmlToText는 &amp;lt;를 &lt;로만 해제한다", () => {
    expect(convertHtmlToText("<p>&amp;lt;</p>")).toBe("&lt;");
  });

  it("matchCount는 잘못된 정규식도 리터럴로 센다", () => {
    expect(matchCount("a(b(c", "(")).toBe(2);
    expect(matchCount("abcabc", "b")).toBe(2);
  });

  it("isNumeric typeIgnore=true는 숫자로 변환할 수 없는 값을 거부한다", () => {
    expect(isNumeric("abc", true)).toBe(false);
    expect(isNumeric("12", true)).toBe(true);
    expect(isNumeric(NaN, true)).toBe(false);
  });

  it("isEmpty는 Map/Set 항목과 Date를 구분한다", () => {
    expect(isEmpty(new Map())).toBe(true);
    expect(isEmpty(new Map([[1, 2]]))).toBe(false);
    expect(isEmpty(new Set([1]))).toBe(false);
    expect(isEmpty(new Date())).toBe(false);
  });

  it("createHTMLElement는 null/undefined 속성을 설정하지 않는다", () => {
    const el = createHTMLElement("div", undefined, { id: undefined, title: null, "aria-hidden": false });
    expect(el.hasAttribute("id")).toBe(false);
    expect(el.hasAttribute("title")).toBe(false);
    expect(el.getAttribute("aria-hidden")).toBe("false");
  });

  it("append는 여러 대상에 Element를 복제해 삽입한다", () => {
    document.body.innerHTML = '<ul class="t"></ul><ul class="t"></ul>';
    append(document.querySelectorAll(".t"), document.createElement("li"));
    expect(document.querySelectorAll(".t > li").length).toBe(2);
  });

  it("eventPosition은 touchend의 changedTouches를 사용한다", () => {
    const touch = { pageX: 7, pageY: 9 };
    const evt = Object.create(TouchEvent.prototype, { touches: { value: [] }, changedTouches: { value: [touch] } });
    expect(eventPosition(evt)).toEqual({ x: 7, y: 9 });
  });
});
