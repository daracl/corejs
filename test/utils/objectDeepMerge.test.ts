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

describe("objectDeepMerge _arrays option", () => {
  it("_excludeKeys만 지정하면 상속된 _arrays 값을 읽거나 적용하지 않는다", () => {
    const original = Object.getOwnPropertyDescriptor(Object.prototype, "_arrays");
    const read = jest.fn(() => "replace");
    try {
      Object.defineProperty(Object.prototype, "_arrays", { configurable: true, get: read });
      const result = objectDeepMerge({ list: [1] }, { list: [2] }, { _excludeKeys: [] });
      expect(result.list).toEqual([1, 2]);
      expect(read).not.toHaveBeenCalled();
    } finally {
      if (original) Object.defineProperty(Object.prototype, "_arrays", original);
      else Reflect.deleteProperty(Object.prototype, "_arrays");
    }
  });

  it("기본값은 배열을 합치고 중복을 제거한다", () => {
    expect(objectDeepMerge({ list: [1, 2] }, { list: [2, 3] })).toEqual({ list: [1, 2, 3] });
    expect(objectDeepMerge({ list: [1, 2] }, { list: [2, 3] }, { _arrays: "merge" })).toEqual({ list: [1, 2, 3] });
  });

  it("replace 는 중첩 배열을 뒤의 배열로 교체한다", () => {
    expect(objectDeepMerge({ list: [1, 2] }, { list: [3] }, { _arrays: "replace" })).toEqual({ list: [3] });
    expect(objectDeepMerge({ a: { list: [1, 2] } }, { a: { list: [2, 2] } }, { _arrays: "replace" })).toEqual({ a: { list: [2, 2] } });
  });

  it("replace 는 빈 배열로 비울 수 있고 소스에 없으면 유지한다", () => {
    expect(objectDeepMerge({ list: [1, 2], keep: [9] }, { list: [] }, { _arrays: "replace" })).toEqual({ list: [], keep: [9] });
  });

  it("replace 는 객체 배열을 깊게 복사하고 원본을 변경하지 않는다", () => {
    const base = { series: [{ f: "a" }] };
    const next = { series: [{ f: "b", opt: { x: 1 } }] };
    const result = objectDeepMerge(base, next, { _arrays: "replace" });

    expect(result).toEqual({ series: [{ f: "b", opt: { x: 1 } }] });
    expect(result.series[0]).not.toBe(next.series[0]);
    expect(result.series[0].opt).not.toBe(next.series[0].opt);
    expect(base).toEqual({ series: [{ f: "a" }] });
  });

  it("_excludeKeys 와 함께 사용할 수 있다", () => {
    expect(objectDeepMerge({ a: 1, list: [1] }, { a: 2, list: [2] }, { _excludeKeys: ["a"], _arrays: "replace" })).toEqual({ a: 1, list: [2] });
  });

  it("옵션만 있는 마지막 객체는 병합 대상이 아니다", () => {
    expect(objectDeepMerge({ a: 1 }, { _arrays: "replace" })).toEqual({ a: 1 });
  });

  it("첫 소스와 배열 안의 배열에도 replace 모드를 적용한다", () => {
    const source = { list: [[1, 1], [2, 2]] };
    const result = objectDeepMerge(source, { _arrays: "replace" });
    expect(result).toEqual(source);
    expect(result.list).not.toBe(source.list);
    expect(result.list[0]).not.toBe(source.list[0]);
  });

  it("중복·NaN·null·undefined의 값과 순서를 보존한다", () => {
    const list = [2, 2, NaN, NaN, null, undefined, false, false];
    expect(objectDeepMerge({ list: [1] }, { list }, { _arrays: "replace" })).toEqual({ list });
  });

  it("배열의 자기 참조와 공유 요소를 복사한다", () => {
    const item = { value: 1 };
    const list: any[] = [item, item];
    list.push(list);
    const result = objectDeepMerge({ list }, { _arrays: "replace" });
    expect(result.list).not.toBe(list);
    expect(result.list[0]).not.toBe(item);
    expect(result.list[0]).toBe(result.list[1]);
    expect(result.list[2]).toBe(result.list);
  });

  it("배열의 타입 변경과 null·undefined 덮어쓰기 규칙을 유지한다", () => {
    expect(objectDeepMerge({ list: [1] }, { list: { value: 2 } }, { _arrays: "replace" })).toEqual({ list: { value: 2 } });
    expect(objectDeepMerge({ list: { value: 1 } }, { list: [2] }, { _arrays: "replace" })).toEqual({ list: [2] });
    expect(objectDeepMerge({ list: [1] }, { list: null }, { _arrays: "replace" })).toEqual({ list: null });
    expect(objectDeepMerge({ list: [1] }, { list: undefined }, { _arrays: "replace" })).toEqual({ list: [1] });
  });

  it("제외한 배열은 초기값을 유지하고 배열 내부의 제외 키도 처리한다", () => {
    const result = objectDeepMerge(
      { keep: [1], list: [{ secret: 1 }] },
      { keep: [], list: [{ secret: 2, value: 3 }] },
      { _excludeKeys: ["keep", "secret"], _arrays: "replace" }
    );
    expect(result).toEqual({ keep: [1], list: [{ value: 3 }] });
  });

  it("호출 사이에 배열 모드가 남지 않고 마지막 소스의 배열을 사용한다", () => {
    expect(objectDeepMerge({ list: [1] }, { list: [2] }, { list: [] }, { _arrays: "replace" })).toEqual({ list: [] });
    expect(objectDeepMerge({ list: [1] }, { list: [2] })).toEqual({ list: [1, 2] });
  });

  it("replace 모드에서도 배열 요소의 위험한 키는 제외한다", () => {
    const item = JSON.parse('{"__proto__":{"polluted":true},"constructor":1,"prototype":2,"value":3}');
    expect(objectDeepMerge({ list: [item] }, { _arrays: "replace" })).toEqual({ list: [{ value: 3 }] });
  });
});
