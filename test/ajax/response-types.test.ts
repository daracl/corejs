import { Ajax } from "../../src/ajax/Ajax";
import type { AjaxResponse } from "../../src/types/web/AjaxResponse";

interface User { id: number; name: string }

describe("Ajax 응답 타입", () => {
  const originalFetch = global.fetch;
  afterEach(() => { global.fetch = originalFetch; jest.restoreAllMocks(); });

  const mockFetch = (text: string, status = 200) => {
    global.fetch = jest.fn().mockResolvedValue({
      status, statusText: "", ok: status < 400, text: async () => text,
      headers: { forEach: (cb: (value: string, key: string) => void) => cb("application/json", "content-type") },
    });
  };

  it("제네릭으로 data 타입을 지정하고 모든 메서드가 AjaxResponse 를 반환한다", async () => {
    mockFetch('[{"id":1,"name":"a"}]');
    const ajax = new Ajax({ fetchMode: "fetch" });

    const listed: AjaxResponse<User[]> = await ajax.get<User[]>("/users");
    const id: number = listed.data[0].id;
    const name: string = listed.data[0].name;
    expect([id, name]).toEqual([1, "a"]);
    expect(listed.status).toBe(200);
    expect(listed.headers["content-type"]).toBe("application/json");
    expect(listed.responseText).toBe('[{"id":1,"name":"a"}]');
    expect(listed.config.url).toBe("");
    expect(listed.loadingInstance).toBeNull();

    const created: AjaxResponse<User[]> = await ajax.post<User[]>("/users", { data: { name: "b" } });
    const updated = await ajax.put<User[]>("/users/1", { data: { name: "c" } });
    const removed = await ajax.delete<User[]>("/users/1");
    const requested = await ajax.request<User[]>({ url: "/users", method: "GET" });
    for (const response of [created, updated, removed, requested]) {
      const first: User = response.data[0];
      expect(first.id).toBe(1);
    }
  });

  it("제네릭을 생략하면 any 라서 기존 코드가 그대로 컴파일된다", async () => {
    mockFetch('{"deep":{"value":42}}');
    const ajax = new Ajax({ fetchMode: "fetch" });
    const legacy = await ajax.get("/x");
    expect(legacy.data.deep.value).toBe(42);
    // 선언되지 않은 속성도 읽을 수 있다(기존 any 호환)
    expect(legacy.somethingElse).toBeUndefined();
    const raw: any = await ajax.get("/x");
    expect(raw.status).toBe(200);
  });

  it("XHR 방식 응답은 readyState 를 포함하고 Fetch 방식은 포함하지 않는다", async () => {
    mockFetch("{}");
    const fetched = await new Ajax({ fetchMode: "fetch" }).get("/x");
    expect(fetched.readyState).toBeUndefined();
    expect(fetched.xhr).toBeDefined();
  });
});
