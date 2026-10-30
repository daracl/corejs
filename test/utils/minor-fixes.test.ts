import { isNumeric } from "../../src/utils/isNumeric";
import { leftPad, rightPad, leftPadClamp } from "../../src/utils/str";
import { toNumber } from "../../src/utils/number";

describe("isNumeric typeIgnore", () => {
  it("숫자와 숫자 문자열은 true 로 판정한다", () => {
    for (const value of [9, "9", "09", "3.14", "-1", "1e3", " 7 ", 0, "0"]) expect(isNumeric(value, true)).toBe(true);
  });

  it("빈 값·null·불리언·배열·객체·날짜는 false 로 판정한다", () => {
    for (const value of ["", "   ", null, undefined, true, false, [], [5], {}, new Date(0), NaN, "abc", "12px"]) expect(isNumeric(value, true)).toBe(false);
  });

  it("기본 모드의 동작은 그대로다", () => {
    expect(isNumeric("")).toBe(false);
    expect(isNumeric(null)).toBe(false);
    expect(isNumeric("12")).toBe(true);
    expect(isNumeric(Infinity)).toBe(false);
  });
});

describe("pad 계열의 공백 문자열", () => {
  it("공백만 있는 문자열도 값으로 유지한다", () => {
    expect(leftPad("  ", 4)).toBe("00  ");
    expect(rightPad(" ", 3, "*")).toBe(" **");
    expect(leftPadClamp("   ", 2)).toBe("  ");
  });

  it("null·undefined·빈 문자열·빈 배열은 기존처럼 빈 값으로 처리한다", () => {
    for (const value of [null, undefined, "", []]) expect(leftPad(value, 3)).toBe("000");
    expect(leftPad(0, 3)).toBe("000");
    expect(leftPad(98, 4)).toBe("0098");
  });
});

describe("toNumber 형식 검사", () => {
  it("일반 숫자·천 단위 쉼표·소수·지수를 변환한다", () => {
    const cases: [string, number][] = [["1,234.50", 1234.5], ["1234", 1234], ["-1,234,567", -1234567], ["+5", 5], [".5", 0.5], ["5.", 5], ["1e3", 1000], ["1,000e-1", 100], [" 42 ", 42], ["0", 0]];
    for (const [text, expected] of cases) expect(toNumber(text)).toBe(expected);
  });

  it("16진수·잘못된 쉼표 위치·숫자가 아닌 문자열은 null 이다", () => {
    for (const text of ["0x10", "0b11", "1,2,3", "12,34", ",123", "1,234,", "1,23.4", "1e", "--1", "Infinity", "1 2", "", "  ", "abc", "12px"]) expect(toNumber(text)).toBeNull();
  });

  it("숫자·그 외 타입은 기존처럼 처리한다", () => {
    expect(toNumber(7)).toBe(7);
    expect(toNumber(0)).toBe(0);
    for (const value of [Infinity, NaN, false, null, undefined, [], {}]) expect(toNumber(value)).toBeNull();
  });
});
