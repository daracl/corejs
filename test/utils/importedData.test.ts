import { compareValues, sortRows, createMatcher, matchRow, highlightSingleMatch, formatDate, formatNumber, formatValue, computeSummary, calcSummary, escapeCellValue, parseClipboard, toTsv, parseTsv, getPagingInfo, getPagingParamToPagingInfo } from "../../src/utils";

describe("추출한 정렬·검색·포맷·페이징", () => {
  it("다중 필드로 안정 정렬하고 null 위치와 원본을 보존한다", () => {
    const source = [{ id: "a", rank: 1 }, { id: "b", rank: 1 }, { id: "c", rank: null }, { id: "d", rank: 2 }];
    expect(sortRows(source, [{ field: "rank", direction: "desc" }], true).map(row => row.id)).toEqual(["d", "a", "b", "c"]);
    expect(source.map(row => row.id)).toEqual(["a", "b", "c", "d"]);
    expect(compareValues(undefined, 1, false)).toBe(-1);
    expect(compareValues(undefined, null)).toBe(0);
    expect(sortRows([{ a: 1, b: 1 }, { a: 1, b: 2 }], [{ field: "a", direction: "asc" }, { field: "b", direction: "desc" }])[0].b).toBe(2);
  });

  it("대소문자·단어 경계·정규식 및 리터럴 대체를 처리한다", () => {
    expect(createMatcher("한글", { matchWholeWord: true })("앞 한글, 뒤")).toBe(true);
    expect(createMatcher("cat", { matchWholeWord: true })("category")).toBe(false);
    expect(createMatcher("ABC")("abc")).toBe(true);
    expect(createMatcher("ABC", { matchCase: true })("abc")).toBe(false);
    expect(createMatcher("^a.+z$", { useRegex: true })("abz")).toBe(true);
    expect(createMatcher("[", { useRegex: true })("x[y")).toBe(true);
    expect(createMatcher("(a+)+$", { useRegex: true })("text (a+)+$")).toBe(true);
    const match = createMatcher("42");
    expect(matchRow({ hidden: "42", value: 42 }, ["value"], match)).toBe(true);
    expect(matchRow({ value: null }, ["value"], match)).toBe(false);
  });

  it("강조 HTML은 core 이스케이프를 사용하며 실행 태그는 거부한다", () => {
    expect(highlightSingleMatch("<b>hello</b>", { start: 3, end: 8 })).toBe("&lt;b&gt;<mark>hello</mark>&lt;/b&gt;");
    expect(() => highlightSingleMatch("alert(1)", { start: 0, end: 8 }, "script")).toThrow();
  });

  it("숫자·날짜·접두사와 통화를 포맷한다", () => {
    expect(formatNumber(1234.5, "0,0.00")).toBe("1,234.50");
    expect(formatDate(new Date(2026, 0, 2, 3, 4, 5), "YYYY/MM/DD HH:mm:ss")).toBe("2026/01/02 03:04:05");
    expect(formatValue("1,234.5", { type: "number", format: "0,0.0", prefix: "$", suffix: "!" })).toBe("$1,234.5!");
    expect(formatValue(10, { type: "currency", format: "USD", locale: "en-US" })).toBe("$10.00");
    expect(formatValue(null)).toBe("");
    expect(formatValue("invalid", { type: "date" })).toBe("invalid");
  });

  it("집계는 숫자만 포함하고 큰 배열에서 인자 수 한계를 넘지 않는다", () => {
    const rows = [{ n: 1 }, { n: "3" }, { n: 5 }, { n: NaN }];
    expect(computeSummary(rows, "n", "average")).toBe(3);
    expect(computeSummary(rows, "n", "count")).toBe(4);
    expect(computeSummary(rows, "n", items => items.length)).toBe(4);
    expect(computeSummary([{ n: "3" }], "n", "min")).toBeNull();
    expect(computeSummary(Array.from({ length: 150000 }, (_, n) => ({ n })), "n", "max")).toBe(149999);
    expect(calcSummary(rows, "avg", "n")).toBe(3);
    expect(calcSummary([], "sum", "n")).toBe("not valid");
    expect(calcSummary(rows, "unknown", "n")).toBe("unknown not valid");
  });

  it("인용된 클립보드와 단순 TSV의 서로 다른 계약을 유지한다", () => {
    const quoted = [escapeCellValue("a\tb"), escapeCellValue('say "hi"'), escapeCellValue("line\nnext")].join("\t");
    expect(parseClipboard(quoted)).toEqual([["a\tb", 'say "hi"', "line\nnext"]]);
    expect(parseClipboard("a\tb\r\nc\td")).toEqual([["a", "b"], ["c", "d"]]);
    expect(toTsv([{ a: "x\ty", b: null }], ["a", "b"])).toBe("x y\t");
    expect(parseTsv("a\tb\r\nc\td\n")).toEqual([["a", "b"], ["c", "d"]]);
  });

  it("페이징 경계와 잘못된 입력을 정규화한다", () => {
    expect(getPagingInfo(0, 1, 10, 10)).toMatchObject({ page: 0, totalPages: 0, nextPage_is: false });
    expect(getPagingInfo(95, 999, 10, 5)).toMatchObject({ page: 10, totalPages: 10, currEndPage: 10, nextPage_is: false });
    const middle = getPagingInfo(1000, 10, 10, 5);
    expect(middle.currEndPage - middle.currStartPage + 1).toBe(5);
    expect(middle.prePage_is).toBe(true);
    expect(middle.nextPage_is).toBe(true);
    expect(getPagingInfo(10, -1, -5, 0)).toMatchObject({ page: 1, pageSize: 10, unitPage: 10 });
    expect(getPagingParamToPagingInfo({ page: 2, pageSize: 5 }, 11)).toMatchObject({ page: 2, totalPages: 3 });
  });
});
