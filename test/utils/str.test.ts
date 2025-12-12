import * as str from "../../src/utils/str";

describe("str", () => {
  it("hello xss check", () => {
    expect("hello").toBe(str.xss("hello"));
  });

  it("1234 xss check", () => {
    expect("1234").toBe(str.xss("1234"));
  });

  const orginStr = "<div>hello</div>";
  let replaceStr = "";
  it("xss", () => {
    replaceStr = str.xss("<div>hello</div>");

    expect("&lt;div&gt;hello&lt;/div&gt;").toBe(replaceStr);
  });

  it("unXss", () => {
    expect(orginStr).toBe(str.unXss(replaceStr));
  });
  
});
