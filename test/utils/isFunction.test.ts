import { isFunction } from "../../src/utils/isFunction";

describe("isFunction", () => {
  it("undefined check", () => {
    expect(false).toBe(isFunction(undefined));
  });

  it("emtpyObj  check", () => {
    let emtpyObj;
    expect(false).toBe(isFunction(emtpyObj));
  });

  it("string number check", () => {
    expect(false).toBe(isFunction("9"));
  });

  it("new String check", () => {
    expect(false).toBe(isFunction(new String("1")));
  });

  it("'' check", () => {
    expect(false).toBe(isFunction(""));
  });

  it("number check", () => {
    expect(false).toBe(isFunction(9));
  });

  it("boolean check", () => {
    expect(false).toBe(isFunction(true));
  });

  it("new Date() check", () => {
    expect(false).toBe(isFunction(new Date()));
  });

  it("null check", () => {
    expect(false).toBe(isFunction(null));
  });

  it("() => {} check", () => {
    expect(true).toBe(isFunction(() => {}));
  });

  it("function check", () => {
    expect(true).toBe(isFunction(function () {}));
  });

  it("(async () => {}) check", () => {
    expect(true).toBe(isFunction(async () => {}));
  });

  it("generator와 bind 함수도 함수로 판별한다", () => {
    expect(isFunction(function* () { yield 1; })).toBe(true);
    expect(isFunction((function () {}).bind(null))).toBe(true);
  });

  it("Function.prototype을 상속한 일반 객체는 함수가 아니다", () => {
    expect(isFunction(Object.create(Function.prototype))).toBe(false);
  });

  it("객체의 프로토타입 조회 없이 false를 반환한다", () => {
    const getPrototypeOf = jest.fn(() => { throw new Error("prototype access"); });
    const value = new Proxy({}, { getPrototypeOf });
    expect(isFunction(value)).toBe(false);
    expect(getPrototypeOf).not.toHaveBeenCalled();
  });

  it("다른 iframe에서 만든 함수도 판별한다", () => {
    const iframe = document.createElement("iframe");
    document.body.appendChild(iframe);
    try {
      const otherDocument = iframe.contentDocument!;
      const fn = otherDocument.createElement("button").click;
      expect(fn instanceof Function).toBe(false);
      expect(isFunction(fn)).toBe(true);
    } finally {
      iframe.remove();
    }
  });
});
