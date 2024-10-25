import { replaceParameter } from "../../src/utils/replaceParameter";

describe("replaceParameter", () => {
  // 사용 예시

  it("param check check", () => {
    expect("aaa=aaaParameter&bbb=111").toEqual(
      replaceParameter("aaa=#aaa#&bbb=#bbb#", {
        aaa: "aaaParameter",
        bbb: "111",
      })
    );
  });

  it("param array check", () => {
    expect("aaa=aaaParameter&bbb=[1,2,3]").toEqual(
      replaceParameter("aaa=#aaa#&bbb=#bbb#", {
        aaa: "aaaParameter",
        bbb: [1, 2, 3],
      })
    );
  });

  it("param object check", () => {
    expect('aaa=aaaParameter&bbb=[1,2,3]&ccc={"test":11}').toEqual(
      replaceParameter("aaa=#aaa#&bbb=#bbb#&ccc=#ccc#", {
        aaa: "aaaParameter",
        bbb: [1, 2, 3],
        ccc: { test: 11 },
      })
    );
  });
});
