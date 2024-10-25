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
});
