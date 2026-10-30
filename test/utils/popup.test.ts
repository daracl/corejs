import { popup, popupPosition } from "../../src/utils/popup";

describe("popup", () => {
  const focus = jest.fn();
  beforeEach(() => {
    jest.spyOn(window, "open").mockReturnValue({ focus } as unknown as Window);
  });
  afterEach(() => {
    jest.restoreAllMocks();
    focus.mockClear();
  });

  it("GET 쿼리를 병합하고 해시와 특수문자를 보존한다", () => {
    popup("/page?keep=1&replace=old#section", { param: { replace: "한글 &", data: { a: 1 }, skip: null } });
    const url = new URL((window.open as jest.Mock).mock.calls[0][0]);
    expect(url.searchParams.get("keep")).toBe("1");
    expect(url.searchParams.get("replace")).toBe("한글 &");
    expect(url.searchParams.get("data")).toBe('{"a":1}');
    expect(url.searchParams.has("skip")).toBe(false);
    expect(url.hash).toBe("#section");
    expect(focus).toHaveBeenCalledTimes(1);
  });

  it("명시한 음수 좌표와 창 옵션을 유지한다", () => {
    popup("/page", { viewOption: "width=500,height=400,left=-1200,top=-20,scrollbars=no,resizable=no" });
    const features = (window.open as jest.Mock).mock.calls[0][2];
    expect(features).toContain("left=-1200");
    expect(features).toContain("top=-20");
    expect(features).toContain("scrollbars=no");
    expect(features).toContain("resizable=no");
  });

  it("POST 값을 HTML로 해석하지 않고 전송한 뒤 폼을 제거한다", () => {
    const value = '\'"><script>alert(1)</script>';
    const submit = jest.spyOn(HTMLFormElement.prototype, "submit").mockImplementation(function (this: HTMLFormElement) {
      expect(this.target).toBe("test");
      expect(this.method).toBe("post");
      expect(this.querySelector("input")?.value).toBe(value);
      expect(this.querySelector("script")).toBeNull();
      expect(this.isConnected).toBe(true);
    });
    popup("/page", { method: "POST", name: "test", param: { submit: value } });
    expect(submit).toHaveBeenCalledTimes(1);
    expect(document.querySelector('form[target="test"]')).toBeNull();
  });

  it("전송 실패에도 임시 폼을 정리한다", () => {
    jest.spyOn(HTMLFormElement.prototype, "submit").mockImplementation(() => { throw new Error("failed"); });
    expect(() => popup("/page", { method: "POST", name: "failure" })).toThrow("failed");
    expect(document.querySelector('form[target="failure"]')).toBeNull();
  });

  it("차단된 POST 팝업에는 폼을 전송하지 않는다", () => {
    jest.spyOn(window, "open").mockReturnValue(null);
    const submit = jest.spyOn(HTMLFormElement.prototype, "submit");
    expect(popup("/page", { method: "POST" })).toBeNull();
    expect(submit).not.toHaveBeenCalled();
  });

  it("실행 가능한 URL을 거부한다", () => {
    expect(() => popup("javascript:alert(1)")).toThrow(TypeError);
    expect(window.open).not.toHaveBeenCalled();
  });

  it("다중 화면의 음수 원점과 정수 비율을 반영한다", () => {
    jest.spyOn(window, "screen", "get").mockReturnValue({ availWidth: 1920, availHeight: 1080, availLeft: -1920, availTop: -1080 } as unknown as Screen);
    expect(popupPosition(800, 600)).toEqual({ left: -1360, top: -840 });
    expect(popupPosition(800, 600, 4.9, 4.9)).toEqual({ left: -1640, top: -960 });
    popup("/page", { viewOption: "width=800,height=600", position: "center" });
    expect((window.open as jest.Mock).mock.calls[0][2]).toContain("left=-1360");
    expect((window.open as jest.Mock).mock.calls[0][2]).toContain("top=-840");
  });

  it.each(["MSIE 10.0", "Trident/7.0"])("IE 화면 좌표와 상단 제한을 반영한다: %s", userAgent => {
    jest.spyOn(window.navigator, "userAgent", "get").mockReturnValue(userAgent);
    jest.spyOn(window, "screen", "get").mockReturnValue({ availWidth: 1920, availHeight: 1080, availLeft: -1920, availTop: -1080 } as unknown as Screen);
    expect(popupPosition(800, 1200)).toEqual({ left: 560, top: 0 });
  });

  it("IE 다중 화면 모드에서는 현재 창의 중앙을 사용한다", () => {
    jest.spyOn(window.navigator, "userAgent", "get").mockReturnValue("Trident/7.0");
    jest.replaceProperty(window, "screenLeft", -1200);
    jest.replaceProperty(window, "screenTop", 100);
    expect(popupPosition(800, 600, 4, 4, true)).toEqual({ left: (window.innerWidth - 800) / 2 - 1200, top: (window.innerHeight - 600) / 2 + 100 });
  });
});
