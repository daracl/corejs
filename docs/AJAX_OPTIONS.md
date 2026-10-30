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
| `signal` | Fetch·XHR 외부 취소. 전역 signal과 요청 signal을 함께 지정하면 둘 중 하나만 취소돼도 요청이 취소된다. 이미 취소된 signal이면 전송하지 않는다. timeout·로더 취소는 외부 컨트롤러를 중단시키지 않는다. 완료 시 signal 리스너를 제거한다. |
| `credentials` | Fetch에 그대로 전달한다. XHR은 `include`이면 withCredentials=true, `same-origin`이면 false다. XHR에서 같은 출처 쿠키까지 제외할 수 없으므로 `omit`은 TypeError로 거부한다. 미지정 시 브라우저 기본 동작을 유지한다. |
| `params` | 모든 HTTP 메서드에서 쿼리에 추가한다. 전역 값과 요청 값을 얕게 병합하고 동일 키는 요청 값이 우선한다. 객체·배열 값은 JSON 문자열로 직렬화한다. |
| `enableLoader` | false면 전역 설정·loaderContainer와 관계없이 로더를 끈다. true면 지정 컨테이너 또는 body에 표시한다. 미지정 시 기존 로더 설정을 따른다. |
| `fetchMode` | 전역 기본값은 xhr이며 요청별로 변경할 수 있다. 세 번째 인자 useFetch(기본 true)는 `fetchMode:"fetch"`일 때만 의미가 있고, useFetch=false 또는 Fetch 미지원 환경이면 fetchMode와 관계없이 XHR을 사용한다. |
| `responseType` | `json`(기본)은 파싱하며 성공 응답의 JSON 파싱에 실패하면 `type:"parse"` 오류로 reject한다. `text` 등은 원문 문자열이다. `blob`·`arraybuffer`는 `data`에 바이너리를 담고 `responseText`는 빈 문자열이다. XHR의 `async:false`에서는 binary를 쓸 수 없다. |
| `onUploadProgress` | 업로드 진행 콜백. `({ xhr, ev })`를 받으며 `ev.lengthComputable`이 true일 때 `ev.loaded / ev.total`로 비율을 계산한다. Fetch는 업로드 진행 이벤트가 없으므로 `fetchMode:"fetch"`와 함께 지정하면 `TypeError`로 거부한다. `fetchMode:"xhr"`(기본값)을 사용한다. |
| `onDownloadProgress` | 다운로드 진행 콜백. `({ xhr, ev })`를 받으며 서버가 `Content-Length`를 주지 않으면 `ev.lengthComputable`이 false다. Fetch는 지원하지 않으므로 `fetchMode:"fetch"`와 함께 지정하면 `TypeError`로 거부한다. `fetchMode:"xhr"`(기본값)을 사용한다. |
| `showProgress` | true면 로더에 진행률을 `42%` 형식으로 표시한다(`.daracl-cl-content`). **파일이 든 업로드**(File·Blob·FileList 또는 파일이 든 FormData)와 **`responseType`이 `blob`·`arraybuffer`인 다운로드**에만 적용하고, 그 외 요청(일반 JSON 요청 등)에는 표시하지 않는다. 시작 시 `0%`로 표시하며, 전체 크기를 알 수 없으면(`lengthComputable=false`, 서버가 `Content-Length`를 주지 않거나 압축 전송) 갱신하지 않는다. 한 요청에 둘 다 해당하면 업로드가 끝난 뒤 다운로드 진행률이 이어서 표시된다. 로더가 표시되는 요청에만 적용한다. Fetch는 진행 이벤트가 없으므로 진행률 표시 대상 요청(파일 업로드·blob/arraybuffer 다운로드)을 `fetchMode:"fetch"`로 보내면 `TypeError`로 거부하고, 대상이 아닌 요청은 Fetch로 보내도 된다. 대상 판단은 요청 시점의 `data`·`responseType` 기준이다. 같은 컨테이너를 여러 요청이 공유하면 마지막으로 갱신한 값이 표시된다. |
| `rawBody` | true면 `data`를 가공하지 않고 그대로 본문으로 보낸다. 기본 동작은 파일이 있으면 multipart(`file` 필드 등)로 감싸고 객체는 JSON으로 직렬화하지만, `rawBody`는 파일 바이트만 받는 API(presigned URL `PUT` 등)용이다. `File`/`Blob`, `ArrayBuffer`·typed array, 문자열, `URLSearchParams`, `FormData`만 허용하며 일반 객체는 `TypeError`다. `Content-Type`은 기본으로 붙이지 않으므로 `headers`로 직접 지정하고, 지정하지 않으면 `Blob`의 `type`을 브라우저가 사용하고(문자열은 브라우저 기본값인 `text/plain;charset=UTF-8`), `rawBody` 없이 문자열을 보낼 때 붙는 `application/x-www-form-urlencoded`는 붙지 않는다. 기본 헤더(`X-Client-Type` 등)가 서명에 포함되지 않는 서버라면 `headers: { "X-Client-Type": null }`로 제거한다. GET/HEAD에서는 무시한다. `showProgress`는 rawBody 업로드에도 적용한다. 예: `ajax.put(url, { data: file, rawBody: true, headers: { "Content-Type": file.type, "X-Client-Type": null } })` |
| `validateStatus` | 성공으로 인정할 HTTP 상태 코드. 기본값은 200~299다. 네트워크 오류·취소·timeout에는 적용하지 않는다. |

이 옵션들은 전역 설정과 요청별 설정에 모두 사용할 수 있다. GET의 기존 `data` 쿼리 전달도 유지한다. 동일 키를 `data`와 `params`에 모두 넣으면 두 값 모두 URL에 추가되므로 한 쪽만 사용하는 것이 좋다.

`beforeRequest`와 `beforeResponse`는 동기 콜백이며 요청별 콜백이 전역 콜백을 대체한다. `beforeRequest`는 요청을 만들기 전에 실행하므로, 첫 번째 인자(options)의 `url`·`params`·`data`·`headers`·`timeout`·`credentials`·`responseType`·`paramsSerializer`를 바꾸면 그 값이 요청에 반영된다(예: `options.headers.Authorization = token`). `options.url`을 바꾸면 `baseUrl`을 다시 적용하고, HTTP method는 바꿀 수 없다. `options.data`는 호출자가 넘긴 객체 그대로이므로 직접 수정하면 호출자의 객체도 바뀐다. XHR은 훅에서 `xhr.setRequestHeader`를 직접 호출해도 되며, URL이 바뀌어 XHR을 다시 open해야 할 때는 그 호출을 기록해 다시 적용한다. beforeResponse는 성공으로 인정한 응답 객체를 반환하기 전에 실행한다. 두 번째 인자는 XHR에서 XMLHttpRequest, Fetch의 beforeRequest에서는 null, Fetch의 beforeResponse에서는 Response다. 반환 값으로 응답을 교체하지는 않으며 첫 번째 인자의 data를 수정할 수 있다.

`errorAlertView`는 기존 호환성을 위해 유지한 예약 옵션이며 아직 실행 동작이 없다. 자동 재시도와 로더 표시 지연은 포함하지 않았다.

## 응답 타입

성공하면 `AjaxResponse<T>`로 resolve합니다. `request`, `get`, `post`, `put`, `delete`에 `data` 타입을 제네릭으로 지정할 수 있으며 기본값은 `any`라서 기존 코드는 그대로 컴파일됩니다.

```ts
import { Ajax, type AjaxResponse } from "@daracl/core";

interface User { id: number; name: string }

const ajax = Ajax.create({ baseUrl: "/api", fetchMode: "fetch" });
const { data, status, headers }: AjaxResponse<User[]> = await ajax.get<User[]>("/users");
```

| 필드 | 설명 |
| --- | --- |
| `data` | 파싱한 본문(`T`). 빈 JSON 본문은 `null`, `blob`/`arraybuffer`는 `Blob`/`ArrayBuffer` |
| `status`, `headers`, `responseText` | 상태 코드, 응답 헤더(이름은 소문자), 원문 문자열(바이너리는 빈 문자열) |
| `config` | 전역 옵션과 병합된 요청 옵션 |
| `xhr` | XHR 방식은 `XMLHttpRequest`, Fetch 방식은 `Response`(호환을 위해 `any`) |
| `loadingInstance` | 이 요청의 로더 또는 `null` |
| `readyState` | XHR 방식에서만 존재 |

`createGlobalAjaxOptions`와 `createDefaultOptions`는 내부용 메서드이며 호환을 위해 공개로 남아 있다. 직접 호출하지 않는다.

## 오류 처리

모든 reject은 `Error`를 상속한 `AjaxError`(ESM은 `import { AjaxError }`, UMD는 `Daracl.AjaxError`)다. `type`으로 원인을 구분한다.

| type | 의미 |
| --- | --- |
| `http` | `validateStatus`를 통과하지 못한 응답. `status`, `statusText`, `responseText`, `response`(data·headers)를 채운다. `blob`·`arraybuffer` 요청의 오류 본문도 문자열로 디코드해 `responseText`·`response.data`에 담는다(Fetch·XHR 공통). |
| `network` | 연결 실패 등 전송 오류. 원본 예외는 `error`에 있다. |
| `timeout` | `timeout` 초과. |
| `abort` | `signal` 또는 로더 취소 버튼으로 취소. 이미 취소된 signal이면 로더·`beforeRequest` 없이 즉시 거부한다. |
| `parse` | 성공 응답의 JSON 파싱 실패(`responseType:"json"`). 빈 본문은 `data: null`로 성공한다. 오류 응답(`http`)은 JSON이 아니어도 `http`로 유지한다. |
| `callback` | `beforeRequest`·`beforeResponse` 훅이 던진 예외. 원본 예외는 `error`에 있다. |
| `method` | `validMethods`에 없는 메서드. 요청을 보내지 않으며 `status`는 405다. 서버가 돌려준 405(`http`)와 구분한다. |

## 요청 규칙

- `validMethods`는 기본값(GET·POST·PUT·DELETE)과 병합하지 않고 지정한 값으로 교체한다. PATCH·HEAD 등을 쓰려면 직접 포함한다.
- GET·HEAD는 본문을 보내지 않는다. `data`는 쿼리로 붙고 파일이 있으면 `TypeError`다.
- 헤더 이름은 대소문자를 구분하지 않는다. 철자만 다른 키는 나중 값(요청 값)이 전역 값을 대체하고, 값이 `undefined`·`null`·빈 문자열이면 해당 헤더를 보내지 않는다(`0`·`false`는 보낸다). 전역 헤더를 한 요청에서만 빼려면 `null`을 지정한다.
- 기본 `Content-Type`은 Fetch·XHR 모두 본문이 있을 때만 붙인다. 객체는 `application/json`, 문자열은 `application/x-www-form-urlencoded`이며 FormData·ArrayBuffer 등은 붙이지 않는다. 직접 지정한 값이 우선한다.
- `paramsSerializer`가 돌려준 문자열의 선행 `?`·`&`는 제거한다.

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
