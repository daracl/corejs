# 공통 유틸리티 이관

대상: ui-drift, ui-form, ui-grid, ui-report-studio, ui-role-builder, ui-components.

각 프로젝트의 util/utils와 이들이 사용하는 순수 shared helper를 검토해 core에 없는 공통 기능을 `src/utils`에 추가했다. 기존 core 함수는 변경하지 않았고 `src/utils/index.ts`를 통해 공개한다. 원본 프로젝트의 코드·의존성·import는 변경하지 않았다. 특정 컴포넌트의 설정·상태·렌더러를 요구하는 기능은 가져오지 않았다.

## 추가한 모듈과 출처

| core 모듈 | 주요 기능 | 원본 |
| --- | --- | --- |
| typeChecks.ts | isNumber, isBoolean, isThenable, isElement, isHTMLElement | components shared/utils/types, report-studio util/utils, grid util/utils |
| number.ts | toNumber, intValue, clamp, formatNumber, toTimestamp | components shared/utils/number·chart/utils, report-studio util/utils, grid util/utils, drift core/geometry |
| array.ts | removeItem, arrayCopy, insertToArray, moveItem, isSequential, arrayEquals, toListValue | grid util/utils·gridUtils, role-builder util/queryLogic |
| stringUtils.ts | 형식 변환, 값 비교·해시, 목록 토글, 조건부 템플릿, scope·data 속성 검사 | grid util/utils, form util/utils, drift viewer/escape |
| objectUtils.ts | cloneJson, cloneConfig, jsonEqual, sameValue, parseConfigString, toOptionObject | report-studio util/utils, components shared/data·grid/utils |
| debounce.ts | 지연 호출과 cancel | grid util/utils |
| data.ts | 비교·정렬·검색·강조·날짜/숫자 표시·집계 | components grid/utils, grid util/utils·searchUtils·mathUtils |
| clipboard.ts | 인용 셀·클립보드 파싱, 단순 TSV | grid util/gridUtils, components grid/utils/clipboard |
| browser.ts | 클립보드 쓰기, 다운로드, SVG 직렬화 | components shared/utils/browser·chart/utils/chartExport, report-studio util/dom, grid util/utils |
| dom.ts | 요소 생성·클래스·스타일·레이어·스크롤·포인터·URL 검사 | grid util/domUtils·styleUtils·eventUtils, drift editor/scrollContainer, report-studio util/dom, components shared/dom |
| paging.ts | getPagingInfo, getPagingParamToPagingInfo와 공통 타입 | grid util/pagingUtil |
| sanitizeHtml.ts | 태그·속성 허용 목록 기반 DocumentFragment 생성 | report-studio util/sanitize |
| path.ts | 축약 옵션·중첩 경로·필드 목록 | components shared/data/path |
| functionRefs.ts | Error 생성, JSON 해석, 함수 참조 직렬화·복원, 파일 읽기 | components shared/errors·shared/loaders·shared/data/functionRefs |

## 기존 core로 통합한 기능

다음 기능은 이름이 달라도 다시 추가하지 않았다.

| 원본 기능 | 사용할 core API | 주의 |
| --- | --- | --- |
| isUndefined, isString, isFunction, isArray, isBlank, isPlainObject, isObject, isDate | 기존 동일 이름 | 기존 core의 판정 계약 유지. 프로젝트마다 숫자 문자열·null prototype·배열·빈 값 판정이 달랐으므로 단순 import 교체 전에 확인 |
| hasOwnProp | hasProperty | own property 검사 |
| replaceXss, unReplace | xss, unXss | 문자열 HTML escape/unescape |
| escapeHtml | xss 또는 escapeHTML | drift의 백틱 escape까지 동일한 함수는 아니므로 속성은 setAttribute 사용 권장 |
| trim·pad·deepCopy·createUuid | 기존 trim·leftPad/rightPad·deepCopy·uuid | UUID의 난수 생성 방식은 원본별로 다르므로 보안 용도로 동등하다고 간주하지 않음 |
| addClass, removeClass, toggleClass, addStyleCss, styleClassSplit | common/dom의 기존 동일 이름 | 다시 복제하지 않음 |
| $getElements, getElementRect, eqAttributeValue, addAttr, removeAttr | 기존 $querySelectorList, getElementRect 및 속성 함수 | 인자·반환 타입 확인 필요 |
| isShiftKey, isCtrlKey, isSpacebar, isEnter, eventPosition, isClickEvent, stopPreventCancel | common/event의 기존 함수 | eventCodeValue는 기존 eventKeyCode와 비교 |
| formatMessage·단순 메시지 치환 | common/message의 formatMessage | {{if}} 템플릿은 별도 renderTemplate |
| grid/form/role-builder merge, components shared/utils/object의 merge | 기존 objectDeepMerge·arrayDeepMerge를 우선 검토 | **원본의 target 변경·배열 교체/연결 규칙이 다르므로 동일 동작의 대체 함수가 아니다.** 원본 merge를 core 이름만 바꿔 중복 추가하지 않음 |

새 유틸리티에서도 isArray·isNil·isFunction·isString·isDate·isPlainObject·hasProperty·deepCopy·trim·leftPad·escapeHTML을 사용한다. 요소 생성은 기존 addClass·addStyleCss, 위치 측정은 getElementRect, 클래스 해석은 styleClassSplit을 재사용한다. 다운로드와 클립보드 대체 DOM은 새 공통 createHTMLElement로 통일했다.

## 가져오지 않은 프로젝트 전용 로직

- drift: 배치·충돌·compact·반응형·드래그 격자·History·Editor·Emitter. 일반 clamp, 스크롤 helper, scope/data 속성 처리만 추출했다.
- form: FormField 기반 타입 검사, XSS field 이름 처리, 검증 메시지·스타일, renderFactory, Language.
- grid: DataManager/ViewItem을 요구하는 multiSort·gridDataSearch, 렌더러·선택 모드·필드 메타·셀 좌표·행 상태·GridOptions 기반 스타일, 아이콘 상수, Language, HTML 템플릿. 순수 비교·검색·집계는 공통 함수로 추출했다.
- report-studio: componentConfig·componentDefinition·gridConfig, 컴포넌트 아이콘·CSS 접두사 상수.
- role-builder: QueryNode/QueryGroup/Operator 기반 생성·변환, Language, HTML 템플릿. 일반 값 목록 변환만 추출했다.
- components: 어댑터 API·GridValidation/메시지 계약, Config UI·StudioShell·KPI 카드·아이콘, 차트 설정 기반 내보내기·canvas 래스터화. 일반 SVG 문자열·URL 처리는 포함했다.

## 이관하면서 구분·보완한 계약

- `isNumber`는 실제 number 타입에서 NaN만 제외한다. 숫자 문자열까지 인정하는 원본 grid/form/role-builder의 isNumber는 core의 isNumeric과 비교해야 한다.
- `cloneJson`은 JSON 손실 규칙, `cloneConfig`는 report-studio의 함수 보존·undefined 제거 규칙이다. 기존 deepCopy와 목적이 달라 별도 함수로 둔다. components shared/data의 동명 cloneConfig는 함수·undefined 등을 보존하므로 core deepCopy와 비교해야 한다.
- `isSameValue`는 문자열 비교, `sameValue`는 객체/배열 내용 비교, `jsonEqual`은 JSON 직렬화 비교다. 서로 대체하지 않는다.
- `toOptionObject`는 deepCopy, `toObjectForm`은 얕은 복사와 문자열 축약형을 지원한다.
- 원본 `replaceMesasgeFormat`의 오타는 새 API에서 `renderTemplate`로 정리했다. 조건 비교·{{key}} 치환을 지원하며 HTML 이스케이프는 하지 않는다. 상속된 프로퍼티는 치환하지 않는다.
- 원본 `addValueIfMissing`은 이름과 달리 포함 여부를 토글하고 배열을 반환한다. 기존 동작을 유지했다.
- `hasClass`는 원본 grid처럼 토큰 중 하나라도 포함하면 true다. `createHTMLElement`는 grid의 일반 속성 문자열화·style/dataset 처리를 기준으로 통합했다. report-studio의 createEl(false 속성 생략)과 완전히 같지는 않다.
- `toDataAttribute`의 drift 전용 예약어는 두 번째 인자로 전달한다: `toDataAttribute(key, ['drift-id'])`.
- `writeClipboard`는 Promise<boolean>을 반환하고 권한 실패 시 textarea fallback을 사용한다. 취소·제거 경로를 위해 debounce에는 cancel을 추가했다.
- `downloadText`의 인자 순서는 components 기준 **text, fileName, type**이다. report-studio의 filename, text와 반대이므로 호출부 교체 시 주의한다. 다운로드 실패 시에도 임시 링크·object URL을 정리한다.
- `arrayEquals`는 순서 무시 시에도 중복 개수를 비교하며 정렬 대신 Map을 쓴다. isSequential·집계도 대규모 배열에서 spread 인자 한계 없이 처리한다.
- 페이징은 원본 반환 필드와 페이지 창 계산을 유지하되 음수·비유한 페이지/크기를 정규화한다. moveItem은 유효하지 않은 인덱스를 무시한다.
- innerLayerPosition은 Grid 전용 위치 보정 대신 일반 컨테이너·viewport 좌표와 가용 높이로 계산한다. 스크롤 측정은 화면 밖 좌표를 viewport로 제한한다.
- setIn/getIn은 위험한 프로토타입 경로·상속된 프로퍼티 접근을 차단한다. 함수 참조는 등록소의 own property만 사용하며 순환 설정은 명시적으로 거부한다.
- highlightSingleMatch는 core escapeHTML을 사용하고 텍스트 강조 태그만 허용한다. isSafeUrl은 data URL에서 래스터 이미지 MIME만 허용하며 SVG data URL을 제외한다. sanitizer는 CSS escape·주석으로 숨긴 URL도 차단하도록 보완했다. 이는 기본 허용 목록 처리이며 모든 외부 HTML에 대한 보안 검증을 보장하지 않는다. templateToElement·renderTemplate·SVG 직렬화·downloadUrl은 sanitization을 대신하지 않는다.
- createMatcher의 정규식 길이·중첩 반복 guard는 일부 위험 패턴만 거르는 휴리스틱이다. 신뢰할 수 없는 정규식의 실행 시간 보장은 아니다.

## 사용 예

```ts
import { debounce, toNumber, sortRows, getPagingInfo, setIn } from '@daracl/core';

const value = toNumber('1,234.50');
const sorted = sortRows([{ price: 2 }, { price: 1 }], [{ field: 'price', direction: 'asc' }]);
const paging = getPagingInfo(sorted.length, 1, 10, 10);
const config = {};
setIn(config, ['header', 'enabled'], true);

const delayed = debounce((text: string) => console.log(text), 200);
delayed('검색');
delayed.cancel();
```

새 export는 ESM에서 개별 import할 수 있다. UMD는 기존 window.Daracl.utils를 통해 노출되며 모든 export를 포함하므로 전체 번들 크기는 증가한다. 각 원본 프로젝트가 이 API를 소비하도록 import를 바꾸는 작업은 별도다.

## 검증

- 전체 Jest: 28개 스위트·270개 테스트 통과. 신규 32개 테스트에서 컬렉션·설정·포맷·검색·페이징·DOM·클립보드·다운로드·HTML 처리를 검증했다.
- TypeScript, SCSS, production/development ES/CJS·UMD 네 빌드, 선언 생성 통과.
- 최소 ESM 소비자 번들은 103바이트로 기존 크기를 유지했다. 기존 core 함수와 중복된 export 이름은 추가하지 않았다.
- 원본 프로젝트에 의존하는 import가 새 모듈에 남아 있지 않음을 확인했다. 실제 브라우저의 클립보드 권한·파일 다운로드·복잡한 레이어 레이아웃 수동 검증은 수행하지 않았다.
