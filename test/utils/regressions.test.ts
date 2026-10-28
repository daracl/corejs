import { deepCopy } from "../../src/utils/deepCopy";
import { objectDeepMerge, arrayDeepMerge } from "../../src/utils/deepMerge";
import { objectToQueryString } from "../../src/utils/objectToQueryString";
import { getURLParams } from "../../src/utils/getURLParams";
import { replaceParameter } from "../../src/utils/replaceParameter";

describe("utility regressions", () => {
  it("replaces template keys literally and preserves falsy values and dollar strings", () => {
    expect(replaceParameter("#a.b#/#axb#/#zero#/#bool#/#money#", {
      "a.b": "literal", axb: "other", zero: 0, bool: false, money: "$&",
    })).toBe("literal/other/0/false/$&");
    expect(replaceParameter("#constructor#", {})).toBe("");
  });
  it("copies nested arrays, dates, primitives and cyclic references", () => {
    const source: any = { nested: [[{ value: 1 }]], date: new Date(123) };
    source.self = source;
    const copy = deepCopy(source);
    copy.nested[0][0].value = 2;
    expect(source.nested[0][0].value).toBe(1);
    expect(copy.self).toBe(copy);
    expect(copy.date).toEqual(source.date);
    expect(copy.date).not.toBe(source.date);
    for (const value of [null, undefined, 0, false, "text"]) expect(deepCopy(value)).toBe(value);
  });

  it("replaces existing dates and preserves array union behavior", () => {
    const date = new Date(456);
    const merged = objectDeepMerge({ date: new Date(123) }, { date });
    expect(merged.date).toEqual(date);
    expect(merged.date).not.toBe(date);
    expect(arrayDeepMerge([1, 2, NaN], [2, 3, NaN])).toEqual([1, 2, NaN, 3, NaN]);
  });

  it("does not mutate Object.prototype through JSON keys", () => {
    const payload = JSON.parse('{"__proto__":{"daraclPolluted":true},"constructor":{"prototype":{"daraclPolluted":true}}}');
    try {
      objectDeepMerge({}, payload);
      expect(({} as any).daraclPolluted).toBeUndefined();
    } finally {
      delete (Object.prototype as any).daraclPolluted;
    }
  });

  it("encodes query values and supports null-prototype objects", () => {
    const source = Object.assign(Object.create(null), { "a&b": "한글 & = #", hasOwnProperty: "ok", skip: undefined });
    const params = new URLSearchParams(objectToQueryString(source));
    expect(params.get("a&b")).toBe("한글 & = #");
    expect(params.get("hasOwnProperty")).toBe("ok");
    expect(params.has("skip")).toBe(false);
  });

  it("parses special and repeated query keys as own properties", () => {
    const params = getURLParams("https://example.com/?a=1&a=2&__proto__=safe");
    expect(params.a).toEqual(["1", "2"]);
    expect(Object.prototype.hasOwnProperty.call(params, "__proto__")).toBe(true);
    expect(params.__proto__).toEqual(["safe"]);
  });
});
