import sinon, { SinonFakeXMLHttpRequest, SinonFakeXMLHttpRequestStatic, fakeServer, SinonFakeServer, SinonFakeServerStatic } from "sinon";
import Ajax from "@/Ajax";
import { AjaxOptions } from "@t/web/AjaxOptions";

describe("Ajax delete method test", () => {
  let ajax: Ajax;
  let server: SinonFakeServer;

  beforeEach(() => {
    server = fakeServer.create();
    server.respondImmediately = true;

    // // sinon의 fakeXHR로 XMLHttpRequest 모킹
    // (global as any).XMLHttpRequest = xhr = sinon.useFakeXMLHttpRequest(); // as SinonFakeXMLHttpRequestStatic;
    // requests = []; // 요청을 저장할 배열
    // xhr.onCreate = (req: SinonFakeXMLHttpRequest) => {
    //   requests.push(req); // 요청이 생성될 때마다 기록
    // };

    // Ajax 인스턴스 생성
    ajax = new Ajax({
      baseUrl: "",
      timeout: 5000,
    });
  });

  afterEach(() => {
    (global as any).XMLHttpRequest.restore();
    // 모든 모킹과 스텁을 복원
    server.restore();
    sinon.restore();
  });

  it("delete method test", async () => {
    // 요청을 비동기적으로 처리
    const responseBody = { message: "success" };

    server.respondWith("delete", "/api/items", [200, { "Content-Type": "application/json" }, JSON.stringify(responseBody)]);

    // Ajax GET 요청
    const resultPromise = ajax.delete("/api/items", { async: false });
    resultPromise
      .then((response: any) => {
        expect(response.data).toMatchObject(responseBody);
      })
      .catch((err: any) => {
        //console.log("err", err);
      })
      .finally((xhr: any) => {
        expect(xhr.method.toLowerCase()).toEqual("delete");
        expect(xhr.status).toBe(200);
        expect(xhr.url).toBe("/api/items");
      });

    server.respond();
  });

  it("Should return 404 error", async () => {
    server.respondWith("post", "/api/items", [200, { "Content-Type": "application/json" }, JSON.stringify({})]);
    ajax.delete("/api/items").catch(function (response, xhr) {
      expect(xhr.status).toBe(404);
    });

    server.respond();
  });
});
