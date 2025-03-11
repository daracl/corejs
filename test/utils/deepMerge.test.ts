import { deepMerge } from "../../src/utils/deepMerge";

describe("deepMerge", () => {
  // 사용 예시
  const obj1 = { name: "daracl", age: 30 };
  const obj2 = { age: 31, gender: "male" };
  const obj3 = { city: "seoul" };
  const arr1 = { arr: [1, 2, 3] };
  const arr2 = { arr: [1, 4, 5] };

  it("obj1 + obj2 check", () => {
    expect({ age: 31, gender: "male", name: "daracl" }).toMatchObject(deepMerge(obj1, obj2));
  });

  it("obj1 + obj2 dst not object value  check", () => {
    const obj3 = { name: "daracl", age: 30, boolValue: false };
    const obj4 = { age: 31, gender: "male", boolValue: { test: 1, test2: 2 } };

    console.log(deepMerge(obj3, obj4));

    expect({ age: 31, gender: "male", name: "daracl", boolValue: { test: 1, test2: 2 } }).toMatchObject(deepMerge(obj3, obj4));
  });

  it("obj1 + obj2 + obj3 check", () => {
    expect({ age: 31, gender: "male", name: "daracl", city: "seoul" }).toMatchObject(deepMerge(obj1, obj2, obj3));
  });

  it("obj1 + arr1 check", () => {
    expect({ age: 30, name: "daracl", arr: [1, 2, 3] }).toMatchObject(deepMerge(obj1, arr1));
  });

  it("arr1 + arr2 check", () => {
    expect({ arr: [1, 2, 3, 4, 5] }).toMatchObject(deepMerge(arr1, arr2));
  });

  it("obj1 + arr1 + arr2 check", () => {
    expect({ name: "daracl", age: 30, arr: [1, 2, 3, 4, 5], city: "seoul" }).toMatchObject(deepMerge(obj1, arr1, arr2, obj3));
  });

  it("arr1.arr, arr2.arr", () => {
    expect([1, 2, 3, 4, 5]).toEqual(deepMerge(arr1.arr, arr2.arr));
  });
});
