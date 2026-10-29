import { deepCopy } from "../../src/utils/deepCopy";
import { toOptionObject } from "../../src/utils/objectUtils";

describe("깊은 복사의 참조와 값 보호", () => {
  it.each(["__proto__", "constructor", "prototype"])("%s 키는 중첩 객체와 배열 안에서도 읽지 않고 제외한다", (key) => {
    const read = jest.fn(() => { throw new Error("blocked getter"); });
    const source: any = { safe: 1 };
    Object.defineProperty(source, key, { enumerable: true, get: read });
    const result = deepCopy({ source, items: [source] });
    expect(result).toEqual({ source: { safe: 1 }, items: [{ safe: 1 }] });
    expect(result.source).toBe(result.items[0]);
    expect(Object.prototype.hasOwnProperty.call(result.source, key)).toBe(false);
    expect(Object.getPrototypeOf(result.source)).toBe(Object.prototype);
    expect(read).not.toHaveBeenCalled();
  });

  it("원본과 분리하면서 순환·공유 참조를 유지한다", () => {
    const shared = { value: 1 };
    const source: any = { a: shared, b: shared, items: [] };
    source.self = source;
    source.items.push(source);
    const result = deepCopy(source);
    expect(result).not.toBe(source);
    expect(result.self).toBe(result);
    expect(result.items[0]).toBe(result);
    expect(result.a).toBe(result.b);
    result.a.value = 2;
    expect(shared.value).toBe(1);
  });

  it("Date의 공유 참조·시간 값·사용자 속성과 유효하지 않은 날짜를 복사한다", () => {
    const date = Object.assign(new Date(123), { metadata: { value: 1 } });
    const result = deepCopy({ a: date, b: date, invalid: new Date(NaN) });
    expect(result.a).not.toBe(date);
    expect(result.a).toBe(result.b);
    expect(result.a.getTime()).toBe(123);
    expect(result.a.metadata).toEqual(date.metadata);
    expect(result.a.metadata).not.toBe(date.metadata);
    result.a.setTime(456);
    expect(date.getTime()).toBe(123);
    expect(Number.isNaN(result.invalid.getTime())).toBe(true);
  });

  it("정규식의 flags·lastIndex·공유 참조를 복사한다", () => {
    const regexp = /abc/gi;
    regexp.lastIndex = 2;
    const result = deepCopy({ a: regexp, b: regexp });
    expect(result.a).not.toBe(regexp);
    expect(result.a).toBe(result.b);
    expect(result.a.source).toBe("abc");
    expect(result.a.flags).toBe("gi");
    expect(result.a.lastIndex).toBe(2);
    result.a.lastIndex = 0;
    expect(regexp.lastIndex).toBe(2);
  });

  it("Map·Set의 키와 값·사용자 속성을 복사하고 순환·공유 참조를 유지한다", () => {
    const item = { value: 1 };
    const map = new Map<unknown, unknown>([[item, item]]);
    map.set("self", map);
    const set = new Set<unknown>([item]);
    set.add(set);
    Object.assign(map, { item });
    const result = deepCopy({ item, map, set });
    expect(result.map).not.toBe(map);
    expect(result.map.get(result.item)).toBe(result.item);
    expect(result.map.item).toBe(result.item);
    expect(result.map.get("self")).toBe(result.map);
    expect(result.set).not.toBe(set);
    expect(result.set.has(result.item)).toBe(true);
    expect(result.set.has(result.set)).toBe(true);
    result.item.value = 2;
    expect(item.value).toBe(1);
  });

  it("1만 단계의 객체와 배열 중첩도 호출 스택을 소진하지 않는다", () => {
    let source: any = { value: 1 };
    for (let index = 0; index < 10000; index++) source = index % 2 ? { child: source } : [source];
    let result = deepCopy(source);
    for (let index = 9999; index >= 0; index--) result = index % 2 ? result.child : result[0];
    expect(result.value).toBe(1);
  });

  it("undefined·희소 배열·Symbol 키·null prototype을 보존한다", () => {
    const symbol = Symbol("value");
    const shared = { value: 1 };
    const array = new Array(3);
    array[1] = undefined;
    const source = Object.assign(Object.create(null), { array, shared, [symbol]: shared });
    Object.defineProperty(source, "hidden", { value: 1 });
    const result = deepCopy(source);
    expect(Object.getPrototypeOf(result)).toBeNull();
    expect(result.array.length).toBe(3);
    expect(0 in result.array).toBe(false);
    expect(1 in result.array).toBe(true);
    expect(2 in result.array).toBe(false);
    expect(result.array[1]).toBeUndefined();
    expect(result[symbol]).toBe(result.shared);
    expect(result[symbol]).not.toBe(shared);
    expect(Object.prototype.hasOwnProperty.call(result, "hidden")).toBe(false);
  });

  it("다른 iframe의 일반 객체와 중첩 데이터도 원본에서 분리한다", () => {
    const iframe = document.createElement("iframe");
    document.body.append(iframe);
    try {
      const realm = iframe.contentWindow as unknown as { Object: ObjectConstructor };
      const source = new realm.Object();
      Object.assign(source, { nested: Object.assign(new realm.Object(), { value: 1 }) });
      const result = deepCopy(source);
      expect(result).not.toBe(source);
      expect(result).toEqual({ nested: { value: 1 } });
      expect(Object.getPrototypeOf(result)).toBe(Object.prototype);
      result.nested.value = 2;
      expect((source as { nested: { value: number } }).nested.value).toBe(1);
    } finally { iframe.remove(); }
  });

  it("클래스·DOM·함수·AbortSignal의 참조를 유지한다", () => {
    class Model { value = 1; }
    const model = new Model(), node = document.createElement("div"), fn = () => 1;
    const signal = new AbortController().signal;
    const source = { model, node, fn, signal };
    const result = deepCopy(source);
    for (const key of ["model", "node", "fn", "signal"] as const) expect(result[key]).toBe(source[key]);
  });

  it("명시적으로 전달한 참조 표를 호출 간에도 재사용한다", () => {
    const seen = new WeakMap<object, any>();
    const source = { value: new Date(123) };
    const first = deepCopy(source, seen);
    expect(deepCopy(source, seen)).toBe(first);
    expect(deepCopy(source.value, seen)).toBe(first.value);
  });

  it("설정 복사에서도 제외 키·undefined·특수 객체 처리를 적용한다", () => {
    const source = JSON.parse('{"__proto__":{"polluted":true},"constructor":1,"prototype":2}');
    Object.assign(source, { value: undefined, regexp: /abc/g });
    const result: any = toOptionObject(source);
    expect(Object.keys(result)).toEqual(["value", "regexp"]);
    expect(result.value).toBeUndefined();
    expect(result.regexp).not.toBe(source.regexp);
    expect(result.regexp.source).toBe("abc");
  });
});
