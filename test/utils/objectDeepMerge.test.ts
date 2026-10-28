import { objectDeepMerge } from "../../src/utils/deepMerge";

describe("objectDeepMerge", () => {
  // 사용 예시
  const obj1 = { name: "daracl", age: 30 };
  const obj2 = { age: 31, gender: "male", name:"ytkim" };
  const obj3 = { city: "seoul" };
  const arr1 = { arr: [1, 2, 3] };
  const arr2 = { arr: [1, 4, 5] };

  it("obj1 + obj2 check", () => {
    expect(objectDeepMerge(obj1, obj2)).toEqual({ age: 31, gender: "male", name: "ytkim" });
  });

  it("obj1 + obj2 dst not object value  check", () => {
    const obj3 = { name: "daracl", age: 30, boolValue: false };
    const obj4 = { age: 31, gender: "male", boolValue: { test: 1, test2: 2 } };

    expect(objectDeepMerge(obj3, obj4)).toEqual({ age: 31, gender: "male", name: "daracl", boolValue: { test: 1, test2: 2 } });
  });

  it("obj1 + obj2 + obj3 check", () => {
    expect(objectDeepMerge(obj1, obj2, obj3)).toEqual({ age: 31, gender: "male", name: "ytkim", city: "seoul" });
  });

  it("obj1 + arr1 check", () => {
    expect(objectDeepMerge(obj1, arr1)).toEqual({ age: 30, name: "daracl", arr: [1, 2, 3] });
  });

  it("arr1 + arr2 check", () => {
    expect(objectDeepMerge(arr1, arr2)).toEqual({ arr: [1, 2, 3, 4, 5] });
  });

  it("obj1 + arr1 + arr2 check", () => {
    expect(objectDeepMerge(obj1, arr1, arr2, obj3)).toEqual({ name: "daracl", age: 30, arr: [1, 2, 3, 4, 5], city: "seoul" });
  });

  it("exclude test", () => {
    expect(objectDeepMerge(obj1, obj2, {_excludeKeys:["name"]})).toEqual({ name: "daracl", age: 31, gender: "male" });
  });
});
