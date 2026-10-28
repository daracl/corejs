import { createHTMLElement, hasClass, resolveClassName, normalizeCssLength, createClassNamer, templateToElement, isElement, isHTMLElement, isVisible, resolveScrollElement, measureScrollTarget, resolveScrollTarget, getBrowserSize, getScrollPosition, outerLayerPosition, innerLayerPosition, isEsc, isPrimaryPointer, isMouseMoved, isSafeUrl, sanitizeHtml, writeClipboard, downloadText, downloadUrl, svgToDataURL, serializeSvg } from "../../src/utils";

describe("추출한 DOM·브라우저 유틸리티", () => {
  const clipboardDescriptor = Object.getOwnPropertyDescriptor(navigator, "clipboard");
  const execDescriptor = Object.getOwnPropertyDescriptor(document, "execCommand");
  const createDescriptor = Object.getOwnPropertyDescriptor(URL, "createObjectURL");
  const revokeDescriptor = Object.getOwnPropertyDescriptor(URL, "revokeObjectURL");
  afterEach(() => {
    document.body.innerHTML = "";
    jest.restoreAllMocks();
    jest.useRealTimers();
    for (const [target, key, descriptor] of [[navigator, "clipboard", clipboardDescriptor], [document, "execCommand", execDescriptor], [URL, "createObjectURL", createDescriptor], [URL, "revokeObjectURL", revokeDescriptor]] as const) {
      if (descriptor) Object.defineProperty(target, key, descriptor);
      else Reflect.deleteProperty(target, key);
    }
  });

  it("요소 생성은 기존 core 클래스·스타일 처리를 재사용한다", () => {
    const element = createHTMLElement("div", "a  b", { style: { backgroundColor: "red", "--color": "blue" }, dataset: { itemId: 1 }, title: "test" });
    expect(hasClass(element, "a unknown")).toBe(true);
    expect(hasClass(element, "")).toBe(false);
    expect(element.style.backgroundColor).toBe("red");
    expect(element.style.getPropertyValue("--color")).toBe("blue");
    expect(element.dataset.itemId).toBe("1");
    expect(resolveClassName(() => " a\t b ")).toEqual(["a", "b"]);
    expect(normalizeCssLength(12)).toBe("12px");
    expect(normalizeCssLength("10rem")).toBe("10rem");
    expect(createClassNamer("test")("a b", " c")).toBe("test-a test-b test-c");
    expect(templateToElement(" <span>text</span> ")!.tagName).toBe("SPAN");
  });

  it("iframe의 HTML과 SVG 요소 타입을 구별한다", () => {
    const iframe = document.createElement("iframe"); document.body.append(iframe);
    const element = iframe.contentDocument!.createElement("div");
    expect(isElement(element)).toBe(true);
    expect(isHTMLElement(element)).toBe(true);
    expect(isHTMLElement(templateToElement("<div>detached</div>"))).toBe(true);
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    expect(isElement(svg)).toBe(true);
    expect(isHTMLElement(svg)).toBe(false);
    expect(isElement(null)).toBe(false);
    expect(isVisible(document.createElement("div"))).toBe(false);
  });

  it("컨테이너별 스크롤 탐색과 viewport 영역을 계산한다", () => {
    const parent = document.createElement("div"), child = document.createElement("div");
    parent.style.overflowY = "auto"; parent.append(child); document.body.append(parent);
    Object.defineProperties(parent, { scrollHeight: { value: 200 }, clientHeight: { value: 100 } });
    jest.spyOn(parent, "getBoundingClientRect").mockReturnValue({ top: -10, bottom: 100, left: 0, right: 20, width: 20, height: 110 } as DOMRect);
    expect(resolveScrollElement(child)).toBe(parent);
    expect(resolveScrollElement(child, "[")).toBe(parent);
    const target = resolveScrollTarget(child);
    expect(target.element).toBe(parent);
    expect([target.top, target.bottom]).toEqual([0, 100]);
    expect(measureScrollTarget()).toEqual({ top: 0, bottom: window.innerHeight });
    expect(resolveScrollElement(child, document.body)).toBeUndefined();
  });

  it("브라우저 크기·스크롤과 레이어 위치를 core rect로 계산한다", () => {
    const element = document.createElement("div");
    jest.spyOn(element, "getBoundingClientRect").mockReturnValue({ top: 10, bottom: 30, left: 20, right: 60, width: 40, height: 20 } as DOMRect);
    expect(getBrowserSize(false)).toEqual({ width: window.innerWidth, height: window.innerHeight });
    expect(getScrollPosition()).toMatchObject({ top: 0, left: 0 });
    expect(outerLayerPosition(element, { x: 0, y: 0 }).top).toBeGreaterThanOrEqual(0);
    expect(innerLayerPosition(element, element, element)).toMatchObject({ left: 0, width: 40 });
    expect(isEsc(new KeyboardEvent("keydown", { key: "Escape" }))).toBe(true);
    expect(isPrimaryPointer(new MouseEvent("mousedown", { button: 0 }))).toBe(true);
    expect(isPrimaryPointer(new MouseEvent("mousedown", { button: 2 }))).toBe(false);
    expect(isMouseMoved({ x: 0, y: 0 }, { x: 6, y: 0 })).toBe(true);
  });

  it("HTML 허용 목록은 실행 요소·이벤트·위험 URL·스타일을 제거한다", () => {
    const fragment = sanitizeHtml('<script>alert(1)</script><unknown><b>safe</b></unknown><a href="java&#9;script:alert(1)" target="_blank" onclick="bad()">link</a><img src="data:text/html,bad"><p style="background:url(x)">text</p>');
    expect(fragment.querySelector("script")).toBeNull();
    expect(fragment.querySelector("unknown")).toBeNull();
    expect(fragment.querySelector("b")!.textContent).toBe("safe");
    const link = fragment.querySelector("a")!;
    expect(link.hasAttribute("href")).toBe(false);
    expect(link.hasAttribute("onclick")).toBe(false);
    expect(link.getAttribute("rel")).toBe("noopener noreferrer");
    expect(fragment.querySelector("img")!.hasAttribute("src")).toBe(false);
    expect(fragment.querySelector("p")!.hasAttribute("style")).toBe(false);
    expect(isSafeUrl("java\tscript:alert(1)")).toBe(false);
    expect(isSafeUrl("https://example.com")).toBe(true);
    expect(isSafeUrl("data:image/png;base64,AAA")).toBe(true);
    expect(isSafeUrl("data:image/svg+xml,<svg onload=alert(1)>")).toBe(false);
    expect(sanitizeHtml('<p style="background:u\\72l(test)">text</p>').querySelector("p")!.hasAttribute("style")).toBe(false);
  });

  it("클립보드 API 실패 시 대체하고 임시 DOM과 포커스를 정리한다", async () => {
    const writeText = jest.fn().mockRejectedValue(new Error("denied"));
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText } });
    const execCommand = jest.fn(() => true);
    Object.defineProperty(document, "execCommand", { configurable: true, value: execCommand });
    const button = document.createElement("button"); document.body.append(button); button.focus();
    expect(await writeClipboard("text")).toBe(true);
    expect(execCommand).toHaveBeenCalledWith("copy");
    expect(document.querySelector("textarea")).toBeNull();
    expect(document.activeElement).toBe(button);
  });

  it("클립보드 성공 시 대체 DOM을 만들지 않는다", async () => {
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText: jest.fn().mockResolvedValue(undefined) } });
    expect(await writeClipboard("text")).toBe(true);
    expect(document.querySelector("textarea")).toBeNull();
  });

  it("다운로드 실패 시에도 링크와 object URL을 정리한다", () => {
    jest.useFakeTimers();
    Object.defineProperty(URL, "createObjectURL", { configurable: true, value: jest.fn(() => "blob:test") });
    const revoke = jest.fn();
    Object.defineProperty(URL, "revokeObjectURL", { configurable: true, value: revoke });
    const downloads: string[] = [];
    jest.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (this: HTMLAnchorElement) {
      downloads.push(this.download);
      throw new Error("click");
    });
    expect(() => downloadText("file.txt", "content")).toThrow("click");
    expect(downloads).toEqual(["file.txt"]);
    expect(URL.createObjectURL).toHaveBeenCalledWith(expect.objectContaining({ size: 7, type: "application/json" }));
    expect(document.querySelector("a")).toBeNull();
    jest.runAllTimers();
    expect(revoke).toHaveBeenCalledWith("blob:test");
    expect(() => downloadUrl("https://example.com", "file")).toThrow("click");
    expect(document.querySelector("a")).toBeNull();
  });

  it("SVG 내보내기는 원본을 변경하지 않는다", () => {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    expect(serializeSvg(svg)).toContain('xmlns="http://www.w3.org/2000/svg"');
    expect(svg.hasAttribute("xmlns")).toBe(false);
    expect(svgToDataURL("<svg/>")).toBe("data:image/svg+xml;charset=utf-8,%3Csvg%2F%3E");
  });
});
