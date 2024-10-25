import { isBlank } from "../../src/utils/isBlank";

describe("isBlank", () => {
  it("null check", () => {
    expect(true).toBe(isBlank(null));
  });

  it("undefined check", () => {
    expect(true).toBe(isBlank(undefined));
  });

  it("'' check", () => {
    expect(true).toBe(isBlank(""));
  });

  it("'   'check", () => {
    expect(true).toBe(isBlank("   "));
  });

  it("string check", () => {
    expect(false).toBe(isBlank("Hello"));
  });

  it("number check", () => {
    expect(false).toBe(isBlank(42));
  });

  it("array check", () => {
    expect(false).toBe(isBlank([]));
  });

  it("object  check", () => {
    expect(false).toBe(isBlank({}));
  });
});
