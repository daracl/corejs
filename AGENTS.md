# corejs 작업 지침

이 저장소는 `@daracl/core` 브라우저 코어 라이브러리다. Ajax, Loading, DOM·이벤트·문자열·객체 유틸리티를 제공한다. `../ui-common-harness`의 작업 흐름을 참고하되 이 저장소의 실제 설정과 사용자 요청을 우선한다. 하네스 사용법과 적용 차이는 [HARNESS.md](HARNESS.md)에 있다.

## 작업 범위

- 시작할 때 `git status --short`, `git log -3 --oneline`과 관련 코드·공개 타입·호출부·테스트를 확인한다. 기존 미커밋 변경을 보존한다.
- 한국어로 간결하게 설명하고 변경 내용·검증 결과·미검증 항목을 함께 보고한다. 새 설명 주석은 한국어로 쓴다.
- 요청과 무관한 재포맷, 리네임, any 일괄 제거, 설정 표준화는 하지 않는다.
- 공개 export, 옵션, 메서드, 전역 이름, CSS 클래스, 패키지 exports 경로의 호환성을 유지한다. 계약 변경이 필요하면 영향을 설명한다.
- 의존성 추가·설치, 커밋·푸시·배포는 현재 작업에서 사용자가 요청한 범위에 있을 때만 한다.
- 형제 프로젝트와 `ui-common-harness` 자체를 이 저장소 작업의 일부로 수정하지 않는다.

## 구조와 계약

- `src/index.ts`: ESM/CJS 공개 export와 SCSS import. 일반 ESM 소비에 전역 등록을 추가하지 않는다.
- `src/index.umd.ts`, `src/global.ts`: 기존 `window.Daracl` 등록. `messaage` 같은 기존 공개 이름도 임의로 교정하지 않는다.
- `src/types/web/AjaxOptions.d.ts` → `Ajax.ts`의 기본값·병합 → `FetchAjax.ts` / `XHRAjax.ts` 순으로 옵션 영향을 확인한다.
- `src/Loading.ts`, DOM·이벤트 코드는 여러 인스턴스가 독립적으로 정리돼야 한다. 타이머·리스너·임시 DOM을 완료·취소·hide/offAll 경로에서 해제한다.
- `api/`는 테스트·개발 서버이며 배포용 브라우저 코드에 포함시키지 않는다.
- `style/daracl.scss`가 스타일 원본이다. `dist/**`, `style/*.css`, `style/*.map`, typedoc 생성물은 직접 편집하지 않는다.

## 코드·설정

- 기존 파일의 인접 코드 스타일과 줄바꿈을 유지한다. `.prettierrc`는 512자·들여쓰기 4·작은따옴표·세미콜론 없음이며 package.json의 prettier 설정 및 실제 코드와 차이가 있다. 이 차이를 일괄 정리하지 않는다.
- 새 런타임 코드는 TypeScript, 하네스·빌드 스크립트는 `.mjs`를 사용한다. 새 공개 함수에는 JSDoc을 작성하고 named export·타입 전용 export를 우선한다.
- 새 코드에 var, 타입 검사 우회 주석을 추가하지 않는다. 기존 strict 설정을 유지한다.
- `@/` → src, `@t/` → src/types 별칭은 TypeScript·Vite·Jest에서 함께 확인한다.
- ESM의 트리셰이킹을 유지한다. 동적 namespace 접근과 Ajax의 Fetch/XHR/Loading 결합은 전체 기능을 남길 수 있다. sideEffects의 배포 UMD·CSS 패턴을 보존한다.

## 검증

- 빠른 점검: `node scripts/harness.mjs audit`
- 타입 검사: `node scripts/harness.mjs typecheck`
- 전체 테스트: `node scripts/harness.mjs test`
- 관련 테스트: `node scripts/harness.mjs test test/ajax/options.test.ts`
- SCSS: `node scripts/harness.mjs scss`
- 빌드·선언 생성·ESM 트리셰이킹: `node scripts/harness.mjs build`
- 전체 검증: `node scripts/harness.mjs verify`

하네스는 현재 Node 실행 파일로 설치된 도구를 직접 호출한다. 의존성이 없으면 설치하지 않고 실패한다. 일반 `npm run build`는 dist를 정리하므로 검증에는 하네스를 사용한다. 산출물은 `test-results/harness/run-*`에 남으며 기존 결과는 삭제하지 않는다. 이는 배포 패키징 검증을 대신하지 않는다.

Jest는 jsdom + ts-jest를 사용한다. `tsconfig.test.json`을 유지한다. Ajax 통합 진입점이 개별 테스트를 import하므로 전체 실행에서 `test/ajax/ajax-.*.test.ts` 중복 수집을 제외하고 직렬 실행한다. 외부 네트워크 대신 mock 또는 로컬 테스트 서버를 사용하며 전역 mock·타이머·DOM을 정리한다. SCSS 검증은 Jest jsdom 안이 아닌 별도 Node 프로세스에서 수행한다.

`pwtest`는 설정·spec을 확인하기 전에는 준비된 E2E로 간주하지 않는다.
