import { isPlainObject } from "../../src/utils/isPlainObject";

describe("isPlainObject", () => {
  it("number check", () => {
    expect(false).toBe(isPlainObject(9));
  });

  it("string number check", () => {
    expect(false).toBe(isPlainObject("9"));
  });

  it("new Date() check", () => {
    expect(false).toBe(isPlainObject(new Date()));
  });

  it("null check", () => {
    expect(false).toBe(isPlainObject(null));
  });

  it("undefined check", () => {
    expect(false).toBe(isPlainObject(undefined));
  });

  it("function check", () => {
    expect(false).toBe(isPlainObject(() => {}));
  });

  it("{}  check", () => {
    expect(true).toBe(isPlainObject({}));
  });

  it("new Object check", () => {
    expect(true).toBe(isPlainObject(new Object()));
  });

  it("object check", () => {
    expect(true).toBe(isPlainObject({ hello: "world" }));
  });

  it("array check", () => {
    expect(false).toBe(isPlainObject([1, 2, 3]));
  });
});
