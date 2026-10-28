import { isString } from "../../src/utils/isString";

describe("isString", () => {
  it("string number check", () => {
    expect(true).toBe(isString("9"));
  });

  it("String 객체는 원시 문자열이 아니므로 false를 반환한다", () => {
    expect(isString(new String("1"))).toBe(false);
  });

  it("'' check", () => {
    expect(true).toBe(isString(""));
  });

  it("'  ' check", () => {
    expect(true).toBe(isString("   "));
  });

  it("number check", () => {
    expect(false).toBe(isString(9));
  });

  it("boolean check", () => {
    expect(false).toBe(isString(true));
  });

  it("new Date() check", () => {
    expect(false).toBe(isString(new Date()));
  });

  it("null check", () => {
    expect(false).toBe(isString(null));
  });

  it("undefined check", () => {
    expect(false).toBe(isString(undefined));
  });

  it("function check", () => {
    expect(false).toBe(isString(() => {}));
  });

  it("{}  check", () => {
    expect(false).toBe(isString({}));
  });

  it("new Object check", () => {
    expect(false).toBe(isString(new Object()));
  });

  it("object check", () => {
    expect(false).toBe(isString({ hello: "world" }));
  });

  it("array check", () => {
    expect(false).toBe(isString([1, 2, 3]));
  });
});
