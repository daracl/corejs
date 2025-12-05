import { arrayDeepMerge } from "../../src/utils/deepMerge";

describe("arrayDeepMerge.test", () => {
  // 사용 예시
  const objArr1 = [{ name: "daracl", age: 30 } , { age: 31, gender: "male" }];
  const objArr2 = [{ name: "daracl", age: 30 } , { age: 31, gender: "male1" }];
  
  const arr1 = [1, 2, 3]; 
  const arr2 = [1, 4, 5];


  it("arr1, arr2", () => {
    expect([1, 2, 3, 4, 5]).toEqual(arrayDeepMerge(arr1, arr2));
  });

  it("objArr1, objArr2", () => {
    const result = arrayDeepMerge(objArr1, objArr2);

    objArr1[0].name='awefw';

    console.log('result : ',objArr1, result);
    expect([{ name: "daracl", age: 30 } , { age: 31, gender: "male" }, { name: "daracl", age: 30 } , { age: 31, gender: "male1" }]).toEqual(result);
  });
});
