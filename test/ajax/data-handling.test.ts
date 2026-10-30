import { FetchAjax } from "../../src/ajax/FetchAjax";
import { XHRAjax } from "../../src/ajax/XHRAjax";

describe("GET data 처리와 빈 응답", () => {
  const originalFetch = global.fetch;
  afterEach(() => { global.fetch = originalFetch; jest.restoreAllMocks(); });

  const mockFetch = (text: string, status = 200) => {
    global.fetch = jest.fn().mockResolvedValue({ ok: true, status, text: async () => text, headers: { forEach: jest.fn() } }) as any;
  };

  it("문자열 data 는 쿼리로 그대로 붙인다", async () => {
    mockFetch("{}");
    await new FetchAjax({}).request("/api", "GET", { data: "a=1&b=2" });
    expect((global.fetch as jest.Mock).mock.calls[0][0]).toBe("/api?a=1&b=2");
    await new FetchAjax({}).request("/api?x=1", "GET", { data: "?a=1" });
    expect((global.fetch as jest.Mock).mock.calls[1][0]).toBe("/api?x=1&a=1");
  });

  it("GET 에 파일이 든 data 는 오류로 거절한다", async () => {
    mockFetch("{}");
    const data = { file: new File(["x"], "a.txt") };
    await expect(new FetchAjax({}).request("/api", "GET", { data })).rejects.toThrow(TypeError);
    await expect(new XHRAjax({}).request("/api", "GET", { data })).rejects.toThrow(TypeError);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("성공 응답의 빈 본문은 data 가 null 이다", async () => {
    mockFetch("", 204);
    const result = await new FetchAjax({}).request("/api", "DELETE", { responseType: "json" });
    expect(result.data).toBeNull();
  });
});

describe("FormData·Date·중첩 파일·순환 참조", () => {
  const originalFetch = global.fetch;
  afterEach(() => { global.fetch = originalFetch; jest.restoreAllMocks(); });
  const mockFetch = () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: true, status: 200, text: async () => "{}", headers: { forEach: jest.fn() } }) as any;
  };

  it("GET 의 문자열 FormData 는 쿼리로 펼치고 파일이 있으면 거절한다", async () => {
    mockFetch();
    const form = new FormData();
    form.append("a", "1");
    await new FetchAjax({}).request("/api", "GET", { data: form });
    expect((global.fetch as jest.Mock).mock.calls[0][0]).toBe("/api?a=1");
    form.append("f", new File(["x"], "a.txt"));
    await expect(new FetchAjax({}).request("/api", "GET", { data: form })).rejects.toThrow(TypeError);
  });

  it("중첩 객체 안의 파일을 key[child] 로 보낸다", async () => {
    mockFetch();
    const file = new File(["x"], "a.txt");
    await new FetchAjax({}).request("/api", "POST", { data: { user: { name: "kim", avatar: file }, list: [{ doc: file }] } });
    const body = (global.fetch as jest.Mock).mock.calls[0][1].body as FormData;
    expect(body.get("user[name]")).toBe("kim");
    expect((body.get("user[avatar]") as File).name).toBe("a.txt");
    expect((body.get("list[0][doc]") as File).name).toBe("a.txt");
  });

  it("Date 는 따옴표 없는 ISO 문자열로 보낸다", async () => {
    mockFetch();
    const date = new Date("2024-01-02T03:04:05.000Z");
    await new FetchAjax({}).request("/api", "GET", { params: { d: date } });
    expect((global.fetch as jest.Mock).mock.calls[0][0]).toBe(`/api?d=${encodeURIComponent(date.toISOString())}`);
    await new FetchAjax({}).request("/api", "POST", { data: { d: date, f: new File(["x"], "a.txt") } });
    expect(((global.fetch as jest.Mock).mock.calls[1][1].body as FormData).get("d")).toBe(date.toISOString());
  });

  it("순환 참조 data 에서 스택 오버플로 없이 containsFile 이 끝난다", async () => {
    mockFetch();
    const data: any = { a: 1 };
    data.self = data;
    await expect(new FetchAjax({}).request("/api", "POST", { data })).rejects.toBeDefined();
    expect((global.fetch as jest.Mock).mock.calls.length).toBe(0);
  });
});
