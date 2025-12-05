import { objectDeepMerge } from "../../src/utils/deepMerge";

describe("objectDeepMerge", () => {
  // 사용 예시
  const obj1 = { name: "daracl", age: 30 };
  const obj2 = { age: 31, gender: "male", name:"ytkim" };
  const obj3 = { city: "seoul" };
  const arr1 = { arr: [1, 2, 3] };
  const arr2 = { arr: [1, 4, 5] };

  it("obj1 + obj2 check", () => {
    expect({ age: 31, gender: "male", name: "ytkim" }).toMatchObject(objectDeepMerge(obj1, obj2));
  });

  it("obj1 + obj2 dst not object value  check", () => {
    const obj3 = { name: "daracl", age: 30, boolValue: false };
    const obj4 = { age: 31, gender: "male", boolValue: { test: 1, test2: 2 } };

    console.log(objectDeepMerge(obj3, obj4));

    expect({ age: 31, gender: "male", name: "daracl", boolValue: { test: 1, test2: 2 } }).toMatchObject(objectDeepMerge(obj3, obj4));
  });

  it("obj1 + obj2 + obj3 check", () => {
    expect({ age: 31, gender: "male", name: "ytkim", city: "seoul" }).toMatchObject(objectDeepMerge(obj1, obj2, obj3));
  });

  it("obj1 + arr1 check", () => {
    expect({ age: 30, name: "daracl", arr: [1, 2, 3] }).toMatchObject(objectDeepMerge(obj1, arr1));
  });

  it("arr1 + arr2 check", () => {
    expect({ arr: [1, 2, 3, 4, 5] }).toMatchObject(objectDeepMerge(arr1, arr2));
  });

  it("obj1 + arr1 + arr2 check", () => {
    expect({ name: "daracl", age: 30, arr: [1, 2, 3, 4, 5], city: "seoul" }).toMatchObject(objectDeepMerge(obj1, arr1, arr2, obj3));
  });

  it("exclude test", () => {
    expect({ name: "daracl", age: 31, gender: "male" }).toMatchObject(objectDeepMerge(obj1, obj2, {_excludeKeys:["name"]}));
  });
});
