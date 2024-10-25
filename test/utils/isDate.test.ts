import { isDate } from "../../src/utils/isDate";

describe("isDate", () => {
  it("new Date() check", () => {
    expect(true).toBe(isDate(new Date()));
  });

  it("new Date('2024-12-10') check", () => {
    expect(true).toBe(isDate(new Date("2024-12-10")));
  });

  it("undefined check", () => {
    expect(false).toBe(isDate(undefined));
  });

  it("emtpyObj  check", () => {
    let emtpyObj;
    expect(false).toBe(isDate(emtpyObj));
  });

  it("string number check", () => {
    expect(false).toBe(isDate("9"));
  });

  it("new String check", () => {
    expect(false).toBe(isDate(new String("1")));
  });

  it("'' check", () => {
    expect(false).toBe(isDate(""));
  });

  it("number check", () => {
    expect(false).toBe(isDate(9));
  });

  it("boolean check", () => {
    expect(false).toBe(isDate(true));
  });

  it("null check", () => {
    expect(false).toBe(isDate(null));
  });

  it("function check", () => {
    expect(false).toBe(isDate(() => {}));
  });

  it("new Object check", () => {
    expect(false).toBe(isDate(new Object()));
  });

  it("object check", () => {
    expect(false).toBe(isDate({ hello: "world" }));
  });

  it("array check", () => {
    expect(false).toBe(isDate([1, 2, 3]));
  });
});
