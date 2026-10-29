import { isPlainObject } from "../../src/utils/isPlainObject";
import { deepCopy } from "../../src/utils/deepCopy";
import { objectDeepMerge } from "../../src/utils/deepMerge";
import { cloneConfig, sameValue, toOptionObject } from "../../src/utils/objectUtils";
import { getIn } from "../../src/utils/path";

describe("isPlainObject", () => {
  it("number check", () => {
    expect(false).toBe(isPlainObject(9));
  });

  it("string number check", () => {
    expect(false).toBe(isPlainObject("9"));
  });

  it("new Date() check", () => {
    expect(false).toBe(isPlainObject(new Date()));
  });

  it("null check", () => {
    expect(false).toBe(isPlainObject(null));
  });

  it("undefined check", () => {
    expect(false).toBe(isPlainObject(undefined));
  });

  it("function check", () => {
    expect(false).toBe(isPlainObject(() => {}));
  });

  it("{}  check", () => {
    expect(true).toBe(isPlainObject({}));
  });

  it("new Object check", () => {
    expect(true).toBe(isPlainObject(new Object()));
  });

  it("object check", () => {
    expect(true).toBe(isPlainObject({ hello: "world" }));
  });

  it("array check", () => {
    expect(false).toBe(isPlainObject([1, 2, 3]));
  });

  it("null prototype 객체를 일반 객체로 판별하고 타입을 좁힌다", () => {
    const value: unknown = Object.assign(Object.create(null), { name: "Alice" });
    expect(isPlainObject(value)).toBe(true);
    if (!isPlainObject(value)) throw new Error("plain object expected");
    const name: unknown = value.name;
    expect(name).toBe("Alice");
  });

  it("클래스와 사용자 정의 프로토타입은 제외한다", () => {
    class Model { value = 1; }
    expect(isPlainObject(new Model())).toBe(false);
    expect(isPlainObject(Object.create({ value: 1 }))).toBe(false);
    expect(isPlainObject(Object.create(Object.create(null)))).toBe(false);
    const parent = Object.assign(Object.create(null), { constructor: Object });
    expect(isPlainObject(Object.create(parent))).toBe(false);
  });

  it("Symbol.toStringTag 값을 읽지 않고 일반 객체를 판별한다", () => {
    const read = jest.fn(() => { throw new Error("tag access"); });
    const value = {};
    Object.defineProperty(value, Symbol.toStringTag, { get: read });
    expect(isPlainObject(value)).toBe(true);
    expect(isPlainObject({ [Symbol.toStringTag]: "Date" })).toBe(true);
    expect(read).not.toHaveBeenCalled();
  });

  it("프로토타입의 constructor 접근자를 실행하지 않는다", () => {
    const read = jest.fn(() => { throw new Error("constructor access"); });
    const parent = Object.create(null);
    Object.defineProperty(parent, "constructor", { get: read });
    expect(isPlainObject(Object.create(parent))).toBe(false);
    expect(read).not.toHaveBeenCalled();
  });

  it("내장 객체와 DOM은 일반 객체로 판별하지 않는다", () => {
    for (const value of [new Map(), new Set(), /abc/, new Date(), document.createElement("div")]) {
      expect(isPlainObject(value)).toBe(false);
    }
  });

  it("null prototype 설정의 함수·undefined·경로 처리를 공통으로 지원한다", () => {
    const fn = () => 1;
    const source = Object.assign(Object.create(null), { nested: { value: 1 }, fn, missing: undefined });
    const config = cloneConfig(source);
    expect(config).toEqual({ nested: { value: 1 }, fn });
    expect(config.nested).not.toBe(source.nested);
    expect(sameValue(source, { nested: { value: 1 }, fn })).toBe(true);
    expect(getIn(source, ["nested", "value"])).toBe(1);
    const options = toOptionObject(source);
    expect(options).not.toBe(source);
    expect(options.nested).not.toBe(source.nested);
  });

  it("다른 iframe의 일반 객체도 복사·병합하며 클래스는 참조를 유지한다", () => {
    const iframe = document.createElement("iframe");
    document.body.append(iframe);
    try {
      const realm = iframe.contentWindow as unknown as { Object: ObjectConstructor; Date: DateConstructor };
      const source = Object.assign(new realm.Object(), { nested: { value: 1 } });
      expect(isPlainObject(source)).toBe(true);
      expect(isPlainObject(new realm.Date())).toBe(false);
      const copy = deepCopy(source);
      expect(copy).not.toBe(source);
      expect(copy.nested).not.toBe(source.nested);
      const merged = objectDeepMerge({ source });
      expect(merged.source).not.toBe(source);
      expect(merged.source.nested).not.toBe(source.nested);
      expect(merged.source.nested).toEqual({ value: 1 });
    } finally { iframe.remove(); }
  });
});
