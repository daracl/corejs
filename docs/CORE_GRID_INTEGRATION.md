# ui-grid 공통 유틸 연결

ui-grid의 공통 함수 25개는 `@daracl/core/utils`를 참조한다. 기존 grid import 경로와 export 이름은 유지하며, 내부 구현을 core 함수 또는 호환 어댑터로 연결했다.

## 연결 방식

- core는 `./utils` 하위 경로에 ESM/CJS 번들과 타입 선언을 제공한다. 이 진입점은 Ajax·Loading·SCSS·전역 등록을 가져오지 않는다.
- `daracl-source` 조건은 `src/utils/index.ts`를 가리킨다. grid의 연결 스크립트가 실제 소스 존재 여부를 확인한 경우에만 Vite에서 이 조건을 사용한다.
- grid의 `scripts/link-core.cjs`는 형제 디렉터리의 package.json에서 이름이 `@daracl/core`인 체크아웃을 찾는다. 폴더 이름과 개인 절대 경로를 설정에 기록하지 않는다.
- 찾은 패키지를 grid의 node_modules에 연결한다. 기존 설치는 grid/.tmp에 보관하고, 연결이 실패하면 복원한다. 반복 실행은 같은 연결을 유지한다.
- 개발·테스트·빌드 lifecycle에서 연결을 확인한다. 다른 위치에 둔 체크아웃 또는 중복 체크아웃은 실행 환경 변수 `DARACL_CORE_ROOT`로 선택한다.
- Vite는 utils의 사전 번들을 제외하고, 실제 core 소스 디렉터리를 허용·감시한다. 저장 시 HMR 또는 전체 새로고침을 보낸다.
- TypeScript는 설치된 패키지 안의 소스 경로를 사용하고, Jest도 실제 연결된 소스를 사용한다. 배포 타입 선언에는 `@daracl/core/utils` 패키지 참조가 유지된다.
- 로컬 소스가 없으면 배포 패키지의 utils 진입점을 사용한다. 배포 시에는 이 진입점을 포함한 core 버전을 먼저 배포해야 한다.

core의 내부 DOM 모듈 한 곳에 있던 `@/utils` 참조는 상대 import로 바꿨다. 따라서 grid의 `@/` 별칭이 core 내부 참조에 간섭하지 않는다.

## 전환 범위와 호환성

- 문자열/XSS: replaceXss, unReplace, isSameValue, getHashCode, camelToUnderscore, camelToKebab, stringSplit, addValueIfMissing, trim.
- 타입·배열·지연 호출: isUndefined, isArray, removeItem, arrayCopy, isEmpty, isFunction, debounce.
- DOM·스타일·포인터·클립보드 파싱: isVisible, templateToElement, hasClass, getBrowserSize, getScrollPosition, outerLayerPosition, normalizeCssLength, isMouseMoved, parseClipboard.

isFunction의 제네릭 타입, isEmpty의 boolean 반환 타입, debounce의 공개 시그니처, arrayCopy의 희소 배열 처리에는 호환 어댑터를 둔다. 숫자 문자열 판별, primitive 문자열 판별, plain object·merge·deepCopy·정수 변환·숫자 포맷·페이징 등 계약이 다른 함수는 grid 구현을 유지한다.

## 실행과 확인

ui-grid에서 평소처럼 실행한다.

```sh
npm run dev
npm test -- --runInBand
npm run test:core-link
```

개발 중 core 유틸 수정에는 core 빌드나 서버 재시작이 필요하지 않다. 이미 켜 둔 서버는 새 연결 설정을 적용하기 위해 한 번 재시작해야 한다.

검증 결과:

- grid 타입 검사와 declaration 생성 통과. tsc-alias 처리 후에도 선언의 패키지 참조가 유지됨.
- grid Jest 23개 suite/141개 테스트 통과. 연결 탐색·중복 선택·실패 복원 Node 테스트 3개 통과.
- grid ESM/CJS·UMD production/development 빌드 통과. UMD와 지연 내보내기의 로컬 소스 조건 적용도 확인.
- 실제 Vite 서버가 core 소스 진입점을 해석하고, 소스 파일 변경 시 캐시를 무효화해 full-reload 알림을 보내는 것 확인. 파일 내용은 수정하지 않고 mtime을 바꾼 뒤 복원함.
- core 전체 Jest 278개, 타입·선언·빌드·트리셰이킹 검증 통과. 실제 npm pack 86개 파일과 별도 소비자 ESM/CJS utils import 검증 통과.
- 배포 패키지의 utils를 기존 Node 방식 TypeScript 모듈 해석으로도 검사했다. utils의 isString만 가져오는 Rollup 소비자는 130바이트로 줄었다.

브라우저에서 그리드 UI 전체를 조작하는 검증은 별도다. 로그와 임시 산출물은 corejs/test-results/grid-core-integration 및 package-*에 저장한다.
