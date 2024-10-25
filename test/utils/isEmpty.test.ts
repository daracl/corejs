import { isEmpty } from "../../src/utils/isEmpty";

describe("isEmpty", () => {
  it("null check", () => {
    expect(true).toBe(isEmpty(null));
  });

  it("undefined check", () => {
    expect(true).toBe(isEmpty(undefined));
  });

  it("'' check", () => {
    expect(true).toBe(isEmpty(""));
  });

  it("'   'check", () => {
    expect(true).toBe(isEmpty("   "));
  });

  it("array check", () => {
    expect(true).toBe(isEmpty([]));
  });

  it("object  check", () => {
    expect(true).toBe(isEmpty({}));
  });

  it("number check", () => {
    expect(false).toBe(isEmpty(42));
  });

  it("String check", () => {
    expect(false).toBe(isEmpty("hello"));
  });

  it("object check", () => {
    expect(false).toBe(isEmpty({ hello: "world" }));
  });

  it("array check", () => {
    expect(false).toBe(isEmpty([1, 2, 3]));
  });
});
