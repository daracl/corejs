import { joinUrl } from "../../src/utils/joinUrl";
import { objectToQueryString } from "../../src/utils/objectToQueryString";

describe("joinUrl", () => {
  it.each([
    ["/api", "users", "/api/users"],
    ["/api/", "users", "/api/users"],
    ["/api//", "/users", "/api/users"],
    ["", "users", "users"],
    [undefined, "/users", "/users"],
    ["/api", "", "/api"],
    ["/api", "?a=1", "/api?a=1"],
    ["/api", "#top", "/api#top"],
    ["/api", "https://example.com/x", "https://example.com/x"],
    ["/api", "//example.com/x", "//example.com/x"],
    ["/api", "HTTP://example.com/x", "HTTP://example.com/x"],
  ])("joinUrl(%p, %p) → %p", (baseUrl, url, expected) => {
    expect(joinUrl(baseUrl, url)).toBe(expected);
  });
});

describe("objectToQueryString null 처리", () => {
  it("undefined 와 null 은 건너뛰고 0/false/빈 문자열은 유지한다", () => {
    expect(objectToQueryString({ a: null, b: undefined, c: 0, d: false, e: "" })).toBe("c=0&d=false&e=");
  });
});
