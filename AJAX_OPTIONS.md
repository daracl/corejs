# Ajax 옵션

```ts
import { Ajax } from "@daracl/core";

const ajax = Ajax.create({
  baseUrl: "/api",
  fetchMode: "fetch",
  credentials: "same-origin",
  enableDefaultLoader: true,
  loaderContainer: "body",
  params: { locale: "ko" },
  beforeRequest: (options) => console.log(options.url),
  beforeResponse: (response) => console.log(response.status),
});

const controller = new AbortController();
const request = ajax.post("/items", {
  params: { page: 1 },
  data: { name: "item" },
  signal: controller.signal,
  enableLoader: false,
  validateStatus: status => status >= 200 && status < 300,
});

// 화면을 떠나거나 요청이 필요 없어졌을 때:
controller.abort();
request.catch(error => {
  if (error.type === "abort") return;
  console.error(error);
});
```

| 옵션 | 동작 |
| --- | --- |
| `signal` | Fetch·XHR 외부 취소. 이미 취소된 signal이면 전송하지 않는다. timeout·로더 취소는 외부 컨트롤러를 중단시키지 않는다. 완료 시 signal 리스너를 제거한다. |
| `credentials` | Fetch에 그대로 전달한다. XHR은 `include`이면 withCredentials=true, `same-origin`이면 false다. XHR에서 같은 출처 쿠키까지 제외할 수 없으므로 `omit`은 TypeError로 거부한다. 미지정 시 브라우저 기본 동작을 유지한다. |
| `params` | 모든 HTTP 메서드에서 쿼리에 추가한다. 전역 값과 요청 값을 얕게 병합하고 동일 키는 요청 값이 우선한다. 객체·배열 값은 JSON 문자열로 직렬화한다. |
| `enableLoader` | false면 전역 설정·loaderContainer와 관계없이 로더를 끈다. true면 지정 컨테이너 또는 body에 표시한다. 미지정 시 기존 로더 설정을 따른다. |
| `fetchMode` | 전역 기본값은 xhr이며 요청별로 변경할 수 있다. Fetch 미지원 환경 또는 기존 세 번째 인자 useFetch=false이면 XHR을 사용한다. |
| `validateStatus` | 성공으로 인정할 HTTP 상태 코드. 기본값은 200~299다. 네트워크 오류·취소·timeout에는 적용하지 않는다. |

이 옵션들은 전역 설정과 요청별 설정에 모두 사용할 수 있다. GET의 기존 `data` 쿼리 전달도 유지한다. 동일 키를 `data`와 `params`에 모두 넣으면 두 값 모두 URL에 추가되므로 한 쪽만 사용하는 것이 좋다.

`beforeRequest`와 `beforeResponse`는 동기 콜백이며 요청별 콜백이 전역 콜백을 대체한다. beforeResponse는 성공으로 인정한 응답 객체를 반환하기 전에 실행한다. 두 번째 인자는 XHR에서 XMLHttpRequest, Fetch의 beforeRequest에서는 null, Fetch의 beforeResponse에서는 Response다. 반환 값으로 응답을 교체하지는 않으며 첫 번째 인자의 data를 수정할 수 있다.

`ignoreResultCheck`, `errorAlertView`는 기존 호환성을 위해 유지한 예약 옵션이며 아직 실행 동작이 없다. 자동 재시도, 로더 표시 지연, binary responseType 처리는 이번 변경에 포함하지 않았다.

## 동시 요청 추적과 Loading 표시

```ts
const ajax = Ajax.create({
  fetchMode: "fetch",
  enableDefaultLoader: true,
  loaderContainer: "body",
  loaderOption: { enableRequestCount: true },
});

const first = ajax.get("/api/items");
const second = ajax.get("/api/summary");

// 진행 중인 두 요청을 ID별로 조회한다.
console.log(ajax.pendingRequests.size); // 2
for (const [id, request] of ajax.pendingRequests) {
  console.log(id, request.url, request.method, request.startedAt);
}

await Promise.allSettled([first, second]);
console.log(ajax.pendingRequests.size); // 0
```

- `pendingRequests`는 Ajax 인스턴스별 Map의 읽기 전용 스냅샷이다. 호출할 때마다 최신 상태를 조회한다. 값에는 id·baseUrl을 적용한 URL·HTTP method·시작 시각만 보관하며, data·헤더·Promise는 보관하지 않는다. URL의 params/data 쿼리 직렬화 전 값을 기록한다.
- 같은 URL을 여러 번 호출해도 각각 다른 ID로 등록한다. 전송 전 등록하고 성공·실패·취소·timeout·전송 준비 예외 시 finally에서 제거한다. 허용되지 않은 HTTP method는 전송하지 않으며 Map에도 등록하지 않는다.
- `loaderOption.enableRequestCount`는 기본 false다. true면 `.daracl-cl-request-count`에 `진행 중 요청: 2` 형식으로 표시한다. 이 옵션 자체가 로더를 켜지는 않으므로 enableDefaultLoader·enableLoader·loaderContainer 중 기존 로더 설정을 함께 사용한다.
- 같은 DOM 컨테이너는 화면 하나를 공유하며 마지막 로딩 인스턴스가 해제될 때 닫힌다. 문자열 선택자와 HTMLElement로 같은 요소를 지정해도 공유한다. 화면·시간 표시·스타일은 처음 생성한 로더의 옵션을 사용한다.
- 카운트는 해당 컨테이너에 연결된 활성 로더의 요청 수를 합산한다. 서로 다른 Ajax 인스턴스도 같은 화면에 표시하면 합산하지만 pendingRequests Map은 각 인스턴스에 독립적이다. 활성 로더 중 하나라도 enableRequestCount가 true일 때 카운트를 표시한다.
- `enableLoader: false`인 요청도 Map에 등록하지만 표시 수에는 포함하지 않는다. 컨테이너가 다르면 각 화면의 요청 수를 따로 표시한다.
- 공유 취소 버튼은 그 화면에 연결된 모든 로더의 취소 콜백을 호출한다. Ajax에서는 해당 요청들을 취소한다. `Loading.destroy()`와 Loading의 timeout은 화면을 해제하며 네트워크 요청 취소나 Map 삭제를 직접 수행하지 않는다.

Loading을 단독으로 사용할 때는 `new Loading(container, { enableRequestCount: true, requestCount: 2 })`와 `loading.setRequestCount(1)`로 직접 갱신할 수 있다. Ajax는 각 요청의 로더에 requestCount=1을 지정한다.
