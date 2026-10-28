# 프로젝트 오류·성능 점검

점검일: 2026-10-28

## 범위

`src` 전체 모듈, `api` 테스트 서버, SCSS, 패키지·빌드·Jest 설정 및 기존 테스트를 검토했다. 생성된 dist 파일은 직접 수정하지 않았다. 실제 브라우저 부하 측정과 의존성 취약점 온라인 조회는 수행하지 않았다.

## 수정한 문제

| 영역 | 확인한 문제 | 변경 |
| --- | --- | --- |
| Fetch | 로딩 취소 버튼이 없으면 AbortController가 생성되지 않아 timeout 무효 | 요청마다 컨트롤러 생성, 응답 본문 읽기까지 timeout 유지, finally에서 타이머 정리 |
| Fetch/Ajax | headers 생략 시 JSON Content-Type 누락, useFetch=false 무시 | 기본 헤더 객체 생성, 명시적 XHR 선택 반영 |
| XHR | open·헤더 설정 중복, 소문자 Content-Type 무시, 호출자 헤더 변경 | 초기화 1회, 대소문자 무관 처리, 헤더 복사 |
| XHR | 업로드 콜백 예외를 다운로드 콜백으로 전달 | 업로드 콜백의 오류 전달 경로 수정 |
| 쿼리 문자열 | &, =, # 등으로 값 손상, hasOwnProperty 덮어쓰기 시 예외, fragment 뒤에 쿼리 삽입 | 키·값 인코딩, 안전한 열거, fragment 앞에 삽입 |
| URL 파싱 | 키마다 getAll을 호출하여 반복 검색, __proto__ 키 처리 오류 | 한 번 순회하며 누적, 특수 키를 own property로 생성 |
| 깊은 복사 | 배열 안의 배열 공유, 원시 값 손상 | 재귀 복사, Date 복사, WeakMap으로 순환·공유 참조 보존 |
| 깊은 병합 | __proto__를 통한 전역 프로토타입 변경, 기존 Date 갱신 결과 유실 | 위험 키 차단, 재귀 반환 값 반영 |
| 배열 병합 | 항목마다 indexOf 검색하여 큰 배열에서 O(n²) | Set 조회로 개선, 기존 NaN 중복 유지 동작 보존 |
| 이벤트 | 선택자·NodeList에 등록한 이벤트 해제 실패, 반복 등록 추적 유실, capture 해제 실패, 전역 강한 참조 잔존 | 실제 노드별 모든 등록·capture 추적, 매니저별 관리, off/offAll 정리 |
| 이벤트 | 위임 이벤트의 텍스트 노드 target에서 closest 예외 | 부모 Element에서 탐색 |
| DOM | 빈 CSS 클래스 조작 시 DOMException, 전달한 Document 대신 전역 document 반환 | 빈 토큰 제거, 전달 문서 반환 |
| Loading | HTMLElement 인스턴스 간 interval 키 충돌, hide 후 timeout 잔존, 이전 타이머가 새 로딩 제거 | 인스턴스별 타이머, hide 시 정리, 자신이 만든 요소만 제거 |
| 템플릿 | 0·false 소실, 정규식 특수문자 키 오치환, $& 등 대체 문자열 해석 | 단일 replace 콜백으로 리터럴 치환 |
| 테스트 서버 | 하드코딩된 C 드라이브 경로, 동일 밀리초 파일명 충돌 | DARACL_UPLOAD_DIR 또는 test-results/uploads 사용, recursive 디렉터리 생성, UUID 파일명 |

배열 병합의 Set 변경과 URL 파싱 단일 순회는 알고리즘 수준의 개선이다. 실제 사용자 환경의 속도 향상 배수는 측정하지 않았다.

## 추가한 테스트

- `test/utils/regressions.test.ts`: 복사 격리·순환 참조·Date·원시 값, 병합 프로토타입 오염, 배열 중복 규칙, 쿼리 인코딩·특수 키, 리터럴 템플릿.
- `test/common/lifecycle.test.ts`: 선택자·NodeList·배열 이벤트 해제, 다중 등록·capture, 매니저 격리, 텍스트 노드 위임, 빈 클래스, 로딩 타이머 정리·재표시.
- `test/ajax/transport-regressions.test.ts`: 로더 없는 Fetch timeout, 본문 읽기 timeout, JSON 헤더, fragment 쿼리, XHR 강제 선택, XHR 초기화 횟수·소문자 헤더.

## 남은 점검 항목

1. **깊은 병합의 순환 참조:** `objectDeepMerge`는 순환 객체에서 재귀가 끝나지 않는다. `deepCopy`는 처리하지만 병합의 순환 그래프 규칙은 별도 정의가 필요하다. 요청 옵션과 일반 데이터에는 순환 참조를 넣지 않는 것이 현재 전제다.
2. **동일 컨테이너의 동시 Loading (후속 수정 완료):** 컨테이너별 활성 인스턴스를 추적해 화면을 공유하고 마지막 인스턴스 해제 시 닫는다. Ajax별 pendingRequests Map과 선택적 요청 수 표시를 추가했다. 로더의 명시적 timeout·destroy는 화면만 해제한다.
3. **중첩 파일 업로드:** containsFile은 재귀 검사하지만 FormData 생성은 중첩 객체를 JSON 문자열로 바꾼다. 중첩 File/Blob 전송과 단일 File 입력은 별도 직렬화 규칙 및 서버 계약이 필요하다.
4. **콜백 오류·응답 규칙:** 사용자 progress 콜백의 예외는 전역으로 전파될 수 있다. 잘못된 JSON도 현재 성공 응답의 `{error}` 데이터로 처리한다. 오류 계약 변경은 호환성 검토가 필요하다.
5. **이벤트 수명:** 활성 매니저는 등록 노드를 보관하므로 컴포넌트 제거 시 off/offAll이 필요하다. once 이벤트 후 내부 등록의 즉시 삭제는 구현하지 않았다.
6. **개발용 API:** 무제한 업로드 용량, 요청 헤더 반사, parseInt 기반 인덱스 허용, 프로세스 메모리 데이터 저장 구조가 남아 있다. 운영 서버용 검증·저장·제한 정책은 포함하지 않았다.
7. **빌드·패키징:** yarn에 종속된 빌드 스크립트, 패키지 exports의 디렉터리 매핑, Node에서 ES .js를 직접 import하는 호환성, 불필요한 런타임 dependencies를 정리할 여지가 있다. Vite CJS API·Sass legacy API 경고도 남는다.
8. **테스트 환경:** 기본 node/npm 실행은 nvm 활성 버전 미설정으로 실패했다. 설치된 Node v24.20.0 실행 파일을 직접 사용했다. node_modules에 jest-html-reporter가 없어 `--reporters=default`로 검증했다. 일반 jest는 Ajax 개별 파일과 통합 진입점을 모두 수집하므로 전체 검증에는 기존 test:all의 제외 패턴을 사용했다.

## 검증 방법

검증 결과: 기존 전체 테스트와 동시 요청·공유 Loading 회귀 테스트 14개가 통과했다(총 25개 스위트·238개 테스트). TypeScript 검사, production/development ES/CJS·UMD 빌드, 선언 생성, ESM 트리셰이킹, `git diff --check`도 통과했다.

Ajax 후속 개선: signal·credentials·params·enableLoader·요청별 fetchMode·validateStatus를 추가했다. 전역 beforeRequest 전달, beforeResponse 실행, Ajax.create의 전역 옵션 타입도 보완했다. 동작과 제한은 [AJAX_OPTIONS.md](./AJAX_OPTIONS.md)를 참고한다.

- TypeScript: `node node_modules/typescript/bin/tsc --noEmit --emitDeclarationOnly false`
- 전체 테스트: `node node_modules/jest/bin/jest.js --runInBand --reporters=default --testPathIgnorePatterns='test/ajax/ajax-.*.test.ts'`
- 프로덕션 빌드: Vite의 ES/CJS 설정과 UMD 설정을 각각 실행. 결과물은 무시되는 `test-results/build-es`, `test-results/build-umd`에 생성.

주의: 쿼리 문자열은 이제 인코딩된 문자열을 반환한다. 이미 인코딩한 값을 넘기던 호출부는 원본 값을 전달해야 한다. EventManager의 offAll은 해당 매니저의 등록을 정리한다.
