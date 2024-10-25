import { isArray } from "../../src/utils/isArray";

describe("isArray", () => {
  it("number check", () => {
    expect(false).toBe(isArray(9));
  });

  it("string number check", () => {
    expect(false).toBe(isArray("9"));
  });

  it("new Date() check", () => {
    expect(false).toBe(isArray(new Date()));
  });

  it("null check", () => {
    expect(false).toBe(isArray(null));
  });

  it("undefined check", () => {
    expect(false).toBe(isArray(undefined));
  });

  it("function check", () => {
    expect(false).toBe(isArray(() => {}));
  });

  it("{}  check", () => {
    expect(false).toBe(isArray({}));
  });

  it("new Object check", () => {
    expect(false).toBe(isArray(new Object()));
  });

  it("object check", () => {
    expect(false).toBe(isArray({ hello: "world" }));
  });

  it("[1, 2, 3] check", () => {
    expect(true).toBe(isArray([1, 2, 3]));
  });

  it("[] check", () => {
    expect(true).toBe(isArray([]));
  });

  it("(new Array check", () => {
    expect(true).toBe(isArray(new Array()));
  });
});
