import { isUndefined } from "../../src/utils/isUndefined";

describe("isUndefined", () => {
  it("undefined check", () => {
    expect(true).toBe(isUndefined(undefined));
  });

  it("emtpyObj  check", () => {
    let emtpyObj;
    expect(true).toBe(isUndefined(emtpyObj));
  });

  it("string number check", () => {
    expect(false).toBe(isUndefined("9"));
  });

  it("new String check", () => {
    expect(false).toBe(isUndefined(new String("1")));
  });

  it("'' check", () => {
    expect(false).toBe(isUndefined(""));
  });

  it("number check", () => {
    expect(false).toBe(isUndefined(9));
  });

  it("boolean check", () => {
    expect(false).toBe(isUndefined(true));
  });

  it("new Date() check", () => {
    expect(false).toBe(isUndefined(new Date()));
  });

  it("null check", () => {
    expect(false).toBe(isUndefined(null));
  });

  it("function check", () => {
    expect(false).toBe(isUndefined(() => {}));
  });

  it("new Object check", () => {
    expect(false).toBe(isUndefined(new Object()));
  });

  it("object check", () => {
    expect(false).toBe(isUndefined({ hello: "world" }));
  });

  it("array check", () => {
    expect(false).toBe(isUndefined([1, 2, 3]));
  });
});
