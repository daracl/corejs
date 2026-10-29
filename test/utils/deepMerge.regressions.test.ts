import { objectDeepMerge, arrayDeepMerge } from "../../src/utils/deepMerge";

describe("깊은 병합의 안전성과 참조 처리", () => {
  it.each(["__proto__", "constructor", "prototype"])("%s 키는 첫 소스·후속 소스·배열 내부에서 읽지 않고 제외한다", (key) => {
    const readBlocked = jest.fn(() => { throw new Error("blocked key read"); });
    const value = { safe: 1 };
    Object.defineProperty(value, key, { enumerable: true, get: readBlocked });
    const result = objectDeepMerge(value, { nested: value, items: [value] }, { _excludeKeys: [] });
    expect(result).toEqual({ safe: 1, nested: { safe: 1 }, items: [{ safe: 1 }] });
    const array = arrayDeepMerge([value], [{ nested: value }]);
    expect(array).toEqual([{ safe: 1 }, { nested: { safe: 1 } }]);
    for (const item of [result, result.nested, result.items[0], array[0], array[1].nested]) {
      expect(Object.prototype.hasOwnProperty.call(item, key)).toBe(false);
    }
    expect(readBlocked).not.toHaveBeenCalled();
  });

  it("상속받은 함수나 객체를 병합 대상으로 사용하지 않는다", () => {
    const before = Object.getOwnPropertyDescriptors(Object.prototype.toString);
    const result = objectDeepMerge({ toString: { mergeProbe: 123 }, valueOf: { nested: true } });
    expect(result.toString).toEqual({ mergeProbe: 123 });
    expect(result.valueOf).toEqual({ nested: true });
    expect(Object.getOwnPropertyDescriptors(Object.prototype.toString)).toEqual(before);
  });

  it("위험한 키는 중첩 객체와 배열에서도 차단한다", () => {
    const value = JSON.parse('{"__proto__":{"polluted":true},"nested":{"constructor":{"prototype":{"polluted":true}},"prototype":1,"safe":2}}');
    const result = objectDeepMerge({ values: [value] });
    expect(result).toEqual({ values: [{ nested: { safe: 2 } }] });
    expect(Object.getPrototypeOf(result.values[0])).toBe(Object.prototype);
  });

  it("함수를 객체로 교체해도 입력 함수와 객체를 변경하지 않는다", () => {
    const fn = Object.freeze(() => 1);
    const source = Object.freeze({ nested: Object.freeze({ value: 2 }) });
    const result = objectDeepMerge({ item: fn }, { item: source });
    expect(result.item).toEqual(source);
    expect(result.item).not.toBe(source);
    expect(Object.keys(fn)).toEqual([]);
    expect(objectDeepMerge({ item: source }, { item: fn }).item).toBe(fn);
  });

  it("배열·일반 객체·원시 값 사이의 타입 변경은 뒤의 값으로 교체한다", () => {
    expect(objectDeepMerge({ a: 1 }, { a: [2, 3] })).toEqual({ a: [2, 3] });
    expect(objectDeepMerge({ a: [1] }, { a: { b: 2 } })).toEqual({ a: { b: 2 } });
    expect(objectDeepMerge({ a: { b: 2 } }, { a: [3] })).toEqual({ a: [3] });
    expect(objectDeepMerge({ a: [1] }, { a: false })).toEqual({ a: false });
  });

  it("순환 객체와 공유 참조를 원본과 분리하여 보존한다", () => {
    const shared = { value: 1 };
    const source: any = { a: shared, b: shared };
    source.self = source;
    const result = objectDeepMerge(source);
    expect(result.self).toBe(result);
    expect(result.a).toBe(result.b);
    expect(result.a).not.toBe(shared);
    result.a.value = 2;
    expect(shared.value).toBe(1);
  });

  it("배열의 자기 참조와 객체·배열 사이 순환도 보존한다", () => {
    const array: any[] = [];
    array.push(array);
    const result = arrayDeepMerge(array);
    expect(result[0]).toBe(result);
    const source: any = { items: [] };
    source.items.push(source);
    const merged = objectDeepMerge(source);
    expect(merged.items[0]).toBe(merged);
  });

  it("깊은 중첩에서도 호출 스택을 소진하지 않는다", () => {
    let source: any = { value: 1 };
    for (let index = 0; index < 10000; index++) source = { child: source };
    let result = objectDeepMerge(source);
    for (let index = 0; index < 10000; index++) result = result.child;
    expect(result.value).toBe(1);
  });

  it("날짜와 정규식의 값·참조 공유·검색 위치를 복사한다", () => {
    const date = new Date(123), pattern = /abc/gi;
    pattern.lastIndex = 2;
    const result = objectDeepMerge({ a: date, b: date, pattern });
    expect(result.a).toEqual(date);
    expect(result.a).not.toBe(date);
    expect(result.a).toBe(result.b);
    expect(result.pattern).not.toBe(pattern);
    expect(result.pattern.source).toBe("abc");
    expect(result.pattern.flags).toBe("gi");
    expect(result.pattern.lastIndex).toBe(2);
  });

  it("Map·Set의 내용과 순환·공유 참조를 복사한다", () => {
    const item = { value: 1 };
    const map = new Map<unknown, unknown>([[item, item]]);
    map.set("self", map);
    const set = new Set<unknown>([item]);
    set.add(set);
    const result = objectDeepMerge({ item, map, set });
    expect(result.map).not.toBe(map);
    expect(result.map.get(result.item)).toBe(result.item);
    expect(result.map.get("self")).toBe(result.map);
    expect(result.set).not.toBe(set);
    expect(result.set.has(result.item)).toBe(true);
    expect(result.set.has(result.set)).toBe(true);
  });

  it("DOM·AbortSignal·사용자 클래스는 참조를 유지하고 후속 객체로 안전하게 교체한다", () => {
    class Model { value = 1; }
    const node = document.createElement("div"), signal = new AbortController().signal, model = new Model();
    const result = objectDeepMerge({ node, signal, model });
    expect(result.node).toBe(node);
    expect(result.signal).toBe(signal);
    expect(result.model).toBe(model);
    expect(objectDeepMerge({ model }, { model: { other: 2 } }).model).toEqual({ other: 2 });
    expect(model).toEqual(new Model());
  });

  it("null prototype 객체의 프로토타입과 중첩 데이터를 복사한다", () => {
    const source = Object.assign(Object.create(null), { value: { a: 1 } });
    const result = objectDeepMerge({ source });
    expect(Object.getPrototypeOf(result.source)).toBeNull();
    expect(result.source.value).toEqual({ a: 1 });
    expect(result.source.value).not.toBe(source.value);
  });

  it("제외 키는 첫 인자 이후에만 적용하고 undefined는 기존 값을 유지한다", () => {
    expect(objectDeepMerge({ nested: { keep: 1, value: 2 } }, { nested: { keep: 9, value: 3 } }, { _excludeKeys: ["keep"] }))
      .toEqual({ nested: { keep: 1, value: 3 } });
    expect(objectDeepMerge({}, { keep: 2 }, { _excludeKeys: ["keep"] })).toEqual({});
    expect(objectDeepMerge({ a: 1 }, { a: undefined, b: null })).toEqual({ a: 1, b: null });
  });

  it("배열의 원시 값 합집합과 NaN·객체 요소 보존 규칙을 유지한다", () => {
    const shared = { a: 1 };
    const result = arrayDeepMerge([1, false, null, undefined, NaN, shared, shared], [1, false, null, undefined, NaN, { a: 1 }]);
    expect(result).toEqual([1, false, null, undefined, NaN, { a: 1 }, { a: 1 }, NaN, { a: 1 }]);
    expect(result[5]).toBe(result[6]);
    expect(result[5]).not.toBe(shared);
  });

  it("인자 생략·잘못된 입력과 최상위 배열의 기존 동작을 유지한다", () => {
    expect(objectDeepMerge()).toEqual([]);
    expect(arrayDeepMerge()).toEqual([]);
    expect(objectDeepMerge(null, undefined, 1)).toEqual({});
    expect(arrayDeepMerge(null, {}, [1, 2])).toEqual([1, 2]);
    expect(objectDeepMerge([1, { a: 2 }])).toEqual({ "0": 1, "1": { a: 2 } });
  });
});
