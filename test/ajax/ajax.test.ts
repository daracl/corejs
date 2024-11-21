import Sinon from "sinon";
import Ajax from "@/Ajax";
import { AjaxOptions } from "@t/web/AjaxOptions";

describe("Ajax Class with Sinon", () => {
  let xhr: Sinon.SinonFakeXMLHttpRequestStatic;
  let ajax: Ajax;
  const mockUrl = "https://api.example.com/data";

  beforeEach(() => {
    // Sinon을 사용하여 XMLHttpRequest 객체를 스텁합니다.
    xhr = Sinon.useFakeXMLHttpRequest();
    // 새로운 Ajax 인스턴스를 생성합니다.
    ajax = new Ajax({ baseUrl: mockUrl });
  });

  afterEach(() => {
    // 테스트 후 Sinon 스텁을 복원하여 다음 테스트에 영향을 주지 않도록 합니다.
    xhr.restore();
  });

  it("should successfully make a GET request and return data", (done) => {
    // 200 OK 응답을 설정합니다.
    const mockResponse = '{"message": "success"}';

    // XMLHttpRequest의 'onload' 핸들러를 스텁하여 성공 응답을 처리합니다.
    xhr.onCreate = (request: Sinon.SinonFakeXMLHttpRequest) => {
      request.respond(200, { "Content-Type": "application/json" }, mockResponse);
    };

    // Ajax 요청을 보내고 결과를 검사합니다.
    ajax
      .get("/endpoint", { method: "GET" })
      .then((response) => {
        expect(response.data).toBe(mockResponse);
        done();
      })
      .catch(done.fail);
  });

  it("should handle a failed GET request with error", (done) => {
    // 500 Internal Server Error 응답을 설정합니다.
    const mockError = "Internal Server Error";

    // XMLHttpRequest의 'onload' 핸들러를 스텁하여 실패 응답을 처리합니다.
    xhr.onCreate = (request: Sinon.SinonFakeXMLHttpRequest) => {
      request.respond(500, { "Content-Type": "application/json" }, mockError);
    };

    // Ajax 요청을 보내고 결과를 검사합니다.
    ajax.get("/endpoint", { method: "GET" }).catch((error) => {
      expect(error.message).toBe(`Request failed with status 500`);
      done();
    });
  });

  it("should successfully make a POST request with data", (done) => {
    const mockData = { name: "John" };
    const mockResponse = '{"message": "Data saved"}';

    // XMLHttpRequest의 'onload' 핸들러를 스텁하여 성공 응답을 처리합니다.
    xhr.onCreate = (request: Sinon.SinonFakeXMLHttpRequest) => {
      request.respond(200, { "Content-Type": "application/json" }, mockResponse);
    };

    // Ajax POST 요청을 보내고 결과를 검사합니다.
    ajax
      .post("/save", { method: "POST", data: mockData })
      .then((response) => {
        expect(response.data).toBe(mockResponse);
        done();
      })
      .catch(done.fail);
  });

  it("should handle a failed POST request with error", (done) => {
    const mockData = { name: "John" };
    const mockError = "Failed to save data";

    // XMLHttpRequest의 'onload' 핸들러를 스텁하여 실패 응답을 처리합니다.
    xhr.onCreate = (request: Sinon.SinonFakeXMLHttpRequest) => {
      request.respond(500, { "Content-Type": "application/json" }, mockError);
    };

    // Ajax POST 요청을 보내고 결과를 검사합니다.
    ajax.post("/save", { method: "POST", data: mockData }).catch((error) => {
      expect(error.message).toBe(`Request failed with status 500`);
      done();
    });
  });

  it("should mock XMLHttpRequest onload", () => {
    // 스파이를 사용하여 onload가 호출되는지 확인합니다.
    const onLoadSpy = Sinon.spy();

    // 200 OK 응답을 설정하고 스파이 함수를 onload에 추가합니다.
    xhr.onCreate = (request: Sinon.SinonFakeXMLHttpRequest) => {
      request.respond(200, { "Content-Type": "application/json" }, '{"message": "success"}');
      //request.onload = onLoadSpy; // 요청이 완료되면 스파이 호출
    };

    ajax.get("/endpoint", { method: "GET" }).then(() => {
      // onload가 호출되었는지 확인합니다.
      expect(onLoadSpy.calledOnce).toBe(true);
    });
  });

  it("should mock XMLHttpRequest onerror", () => {
    // 스파이를 사용하여 onerror가 호출되는지 확인합니다.
    const onErrorSpy = Sinon.spy();

    // 500 Internal Server Error 응답을 설정하고 스파이 함수를 onerror에 추가합니다.
    xhr.onCreate = (request: Sinon.SinonFakeXMLHttpRequest) => {
      request.respond(500, { "Content-Type": "application/json" }, "Error occurred");
      request.onerror = onErrorSpy; // 에러가 발생하면 스파이 호출
    };

    ajax.get("/endpoint", { method: "GET" }).catch(() => {
      // onerror가 호출되었는지 확인합니다.
      expect(onErrorSpy.calledOnce).toBe(true);
    });
  });
});
