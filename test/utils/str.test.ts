import * as str from "../../src/utils/str";

describe("str", () => {
  it("hello xss check", () => {
    expect("hello").toBe(str.xss("hello"));
  });

  it("1234 xss check", () => {
    expect("1234").toBe(str.xss("1234"));
  });

  // 테스트 간 공유 상태를 두지 않아 실행 순서와 관계없이 통과한다
  const orginStr = "<div>hello</div>";
  const replaceStr = "&lt;div&gt;hello&lt;/div&gt;";

  it("xss", () => {
    expect(str.xss(orginStr)).toBe(replaceStr);
  });

  it("unXss", () => {
    expect(str.unXss(replaceStr)).toBe(orginStr);
  });

  it("xss → unXss 는 원문으로 되돌아온다", () => {
    expect(str.unXss(str.xss(orginStr))).toBe(orginStr);
  });

});
