import * as utils from "../../src/utils";

describe("추출한 공통 컬렉션·설정 유틸리티", () => {
  afterEach(() => jest.useRealTimers());

  it("기존 core 타입 계약을 유지하면서 엄격한 숫자·boolean 검사를 제공한다", () => {
    expect(utils.isNumber("12")).toBe(false);
    expect(utils.isNumeric("12")).toBe(true);
    expect(utils.isNumber(NaN)).toBe(false);
    expect(utils.isNumber(Infinity)).toBe(true);
    expect(utils.isBoolean(false)).toBe(true);
    expect(utils.isBoolean(0)).toBe(false);
    expect(utils.isThenable(Promise.resolve())).toBe(true);
    expect(utils.isThenable(Object.assign(() => {}, { then() {} }))).toBe(true);
    expect(utils.isThenable({ then: 1 })).toBe(false);
    expect(utils.isThenable(null)).toBe(false);
  });

  it.each([["1,234.50", 1234.5], ["  ", null], [false, null], [Infinity, null], ["no", null], [0, 0]] as const)("toNumber(%s)", (value, expected) => {
    expect(utils.toNumber(value)).toBe(expected);
  });

  it("숫자·날짜를 정규화하고 기존 core 날짜 검사를 사용한다", () => {
    expect(utils.intValue("12px")).toBe(12);
    expect(utils.clamp(10, 1, 5)).toBe(5);
    expect(utils.toTimestamp(new Date(123))).toBe(123);
    expect(utils.toTimestamp(new Date(NaN))).toBeNull();
    expect(utils.toTimestamp("2026-01-01T00:00:00Z")).toBe(Date.UTC(2026, 0, 1));
    expect(utils.toTimestamp("invalid")).toBeNull();
    expect(utils.toTimestamp(Infinity)).toBeNull();
  });

  it("배열 제거·복사는 원본을 보존하고 이동·삽입은 원본을 갱신한다", () => {
    const source = [1, 2, 2, 3];
    expect(utils.removeItem(source, 2)).toEqual([1, 2, 3]);
    expect(source).toEqual([1, 2, 2, 3]);
    expect(utils.arrayCopy(source, 1, 3)).toEqual([2, 2]);
    expect(utils.moveItem(source, 0, 3)).toBe(source);
    expect(source).toEqual([2, 2, 3, 1]);
    expect(utils.moveItem(source, 9, 0)).toEqual(source);
    expect(utils.insertToArray(source, [4, 5], false, undefined, 3)).toBe(source);
    expect(source).toEqual([1, 4, 5]);
    expect(utils.insertToArray([1, 2], 9, true, 1)).toEqual([9, 1, 2]);
  });

  it("큰 배열의 연속성 검사와 순서 없는 중복 비교를 처리한다", () => {
    expect(utils.isSequential(Array.from({ length: 150000 }, (_, index) => index))).toBe(true);
    expect(utils.isSequential([])).toBe(false);
    expect(utils.isSequential([1, 1])).toBe(false);
    expect(utils.isSequential([1.5, 2.5])).toBe(false);
    expect(utils.arrayEquals([1, 2, 1], [2, 1, 1], true)).toBe(true);
    expect(utils.arrayEquals([1, 2, 1], [2, 2, 1], true)).toBe(false);
    expect(utils.arrayEquals([{ id: 1 }], [{ id: 1 }], false, value => value.id)).toBe(true);
    expect(utils.arrayEquals([NaN], [NaN], true)).toBe(false);
  });

  it("문자열 목록과 camelCase를 변환하고 기존 토글 동작을 유지한다", () => {
    expect(utils.toListValue(" a, ,b ")).toEqual(["a", "b"]);
    const source = [1, 2];
    expect(utils.toListValue(source)).toBe(source);
    expect(utils.toListValue(null)).toEqual([]);
    expect(utils.camelToKebab("itemName")).toBe("item-name");
    expect(utils.camelToUnderscore("itemName")).toBe("item_name");
    expect(utils.addValueIfMissing("a,b", "a")).toEqual(["b"]);
    expect(utils.addValueIfMissing("a,b", "c", true, ",", ["b"])).toEqual(["b", "c"]);
    expect(utils.isSameValue(1, "1")).toBe(true);
    expect(utils.isSameValue(null, undefined)).toBe(true);
    expect(utils.getHashCode("")).toBe(0);
    expect(utils.getHashCode("abc")).toBe("96354");
  });

  it("조건부 템플릿에서 false·0·달러 문자를 보존하고 상속된 키는 사용하지 않는다", () => {
    expect(utils.renderTemplate("{{if(n>=2)}}{{n}}:{{text}}{{/if}} {{flag}}", { n: 2, text: "$&", flag: false })).toBe("2:$& false");
    expect(utils.renderTemplate("{{if(n<2)}}yes{{/if}} {{n}} {{constructor}}", { n: 0 })).toBe("yes 0 ");
    expect(utils.stringSplit("a|b", "|")).toEqual(["a", "b"]);
    expect(utils.toDataAttribute("itemId")).toBe("data-item-id");
    expect(utils.toDataAttribute("driftId", ["drift-id"])).toBeUndefined();
    expect(() => utils.assertScope("x; color:red")).toThrow();
  });

  it("JSON 복사와 설정 복사의 구별을 유지하고 core deepCopy를 재사용한다", () => {
    const fn = () => 1;
    const source = { fn, optional: undefined, list: [undefined, fn], date: new Date(0) };
    expect(utils.cloneJson({ date: source.date })).toEqual({ date: "1970-01-01T00:00:00.000Z" });
    const copy = utils.cloneConfig(source);
    expect(copy.fn).toBe(fn);
    expect(copy.list).toEqual([fn]);
    expect(Object.hasOwn(copy, "optional")).toBe(false);
    const option = { nested: { value: 1 } };
    const converted = utils.toOptionObject(option);
    expect(converted).toEqual(option);
    expect(converted.nested).not.toBe(option.nested);
    expect(utils.toOptionObject(false)).toEqual({ enabled: false });
    expect(utils.parseConfigString("[]")).toEqual({});
    expect(utils.parseConfigString('{"x":1}')).toEqual({ x: 1 });
    expect(utils.parseConfigString("bad")).toEqual({});
    expect(utils.jsonEqual({ a: 1 }, { a: 1 })).toBe(true);
    const a: { self?: unknown } = {}, b: { self?: unknown } = {};
    a.self = a; b.self = b;
    expect(utils.sameValue(a, b)).toBe(true);
    expect(utils.sameValue({ a: 1 }, { a: 2 })).toBe(false);
  });

  it("경로 갱신은 중간 객체를 복사하고 빈 경로·프로토타입 오염을 차단한다", () => {
    const original = { nested: { value: 1 } };
    const config: Record<string, unknown> = { ...original };
    utils.setIn(config, ["nested", "value"], 2);
    expect(original.nested.value).toBe(1);
    expect(utils.getIn(config, ["nested", "value"])).toBe(2);
    utils.setIn(config, ["nested", "value"], undefined, { prune: true });
    expect(config).toEqual({});
    for (const path of [[], ["__proto__", "polluted"], ["constructor", "prototype"]]) expect(() => utils.setIn(config, path, true)).toThrow();
    expect(utils.getIn({}, ["constructor"])).toBeUndefined();
    expect(utils.getIn({ enabled: true }, ["enabled", "enabled"], utils.toObjectForm)).toBe(true);
    expect(utils.fieldsOf([{ b: 1 }, { a: 2, b: 3 }, null])).toEqual(["b", "a"]);
    expect(utils.fieldDisplayName("name", "이름")).toBe("이름(name)");
  });

  it("함수 참조를 JSON 왕복 복원하고 누락 함수·위험 키·순환 참조를 처리한다", () => {
    const run = () => 1;
    const hidden = () => 2;
    const saved = utils.stringifyWithFunctions({ run, hidden, nested: [run] }, { run });
    expect(saved.omitted).toEqual(["hidden"]);
    const restored = utils.parseConfigJson<{ run: typeof run; nested: unknown[] }>(saved.json!, { run });
    expect(restored.run).toBe(run);
    expect(restored.nested[0]).toBe(run);
    expect(() => utils.restoreFunctions("@fn:toString")).toThrow(/not registered/);
    expect(() => utils.parseConfigJson("[]")).toThrow(/must be an object/);
    expect(() => utils.parseJson("{", utils.createErrorFactory("[test]"))).toThrow(/\[test\] invalid JSON/);
    const special = utils.restoreFunctions<Record<string, unknown>>(JSON.parse('{"__proto__":{"safe":true}}'));
    expect(Object.hasOwn(special, "__proto__")).toBe(true);
    expect(({} as Record<string, unknown>).safe).toBeUndefined();
    const cyclic: { self?: unknown } = {}; cyclic.self = cyclic;
    expect(() => utils.stringifyWithFunctions(cyclic)).toThrow(/Cyclic/);
  });

  it("debounce는 마지막 this·인자만 사용하고 cancel로 정리한다", () => {
    jest.useFakeTimers();
    const events: string[] = [];
    const fn = utils.debounce(function(this: { prefix: string }, value: number) { events.push(`${this.prefix}${value}`); }, 10);
    fn.call({ prefix: "a" }, 1);
    fn.call({ prefix: "b" }, 2);
    jest.advanceTimersByTime(10);
    expect(events).toEqual(["b2"]);
    fn.call({ prefix: "c" }, 3); fn.cancel();
    expect(jest.getTimerCount()).toBe(0);
  });
});
