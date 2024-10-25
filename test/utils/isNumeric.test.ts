import { isNumeric } from "../../src/utils/isNumeric";

describe("isNumeric", () => {
  it("number check", () => {
    expect(true).toBe(isNumeric(9));
  });

  it("string number check", () => {
    expect(true).toBe(isNumeric("9"));
  });

  it("09 check", () => {
    expect(true).toBe(isNumeric("09"));
  });

  it("3.14 check", () => {
    expect(true).toBe(isNumeric("3.14"));
  });

  it("NaN check", () => {
    expect(false).toBe(isNumeric(NaN));
  });

  it("null check", () => {
    expect(false).toBe(isNumeric(null));
  });

  it("undefined check", () => {
    expect(false).toBe(isNumeric(undefined));
  });

  it("{}  check", () => {
    expect(false).toBe(isNumeric({}));
  });

  it("String check", () => {
    expect(false).toBe(isNumeric("hello"));
  });

  it("object check", () => {
    expect(false).toBe(isNumeric({ hello: "world" }));
  });

  it("array check", () => {
    expect(false).toBe(isNumeric([1, 2, 3]));
  });
});
