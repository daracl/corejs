import { deepCopy } from "../../src/utils/deepCopy";

describe("deepCopy", () => {
  // 사용 예시
  const obj1 = { name: "daracl", age: 30 };

  const arr3 = [
    { name: "daracl", age: 30 },
    { name: "darac2", age: 20 },
  ];

  it("obj1 check", () => {
    expect(deepCopy(obj1)).toEqual({ name: "daracl", age: 30 });
  });

  it("arr1", () => {
    const deepArray = deepCopy(arr3);
    arr3[0].name = "dasracl2";

    expect(arr3).not.toEqual(deepCopy(deepArray));
  });
});
