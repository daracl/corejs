import { isObject } from "../../src/utils/isObject";

describe("isObject", () => {
  it("number check", () => {
    expect(false).toBe(isObject(9));
  });

  it("string number check", () => {
    expect(false).toBe(isObject("9"));
  });

  it("new Date() check", () => {
    expect(true).toBe(isObject(new Date()));
  });

  it("null check", () => {
    expect(false).toBe(isObject(null));
  });

  it("undefined check", () => {
    expect(false).toBe(isObject(undefined));
  });

  it("function check", () => {
    expect(true).toBe(isObject(() => {}));
  });

  it("{}  check", () => {
    expect(true).toBe(isObject({}));
  });

  it("object check", () => {
    expect(true).toBe(isObject({ hello: "world" }));
  });

  it("array check", () => {
    expect(true).toBe(isObject([1, 2, 3]));
  });
});
