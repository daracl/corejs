# 빌드 경고·의존성 보안 점검

점검일: 2026-10-28. 대상: @daracl/core 0.0.6.

## 권장 진행 순서 적용 결과

아래 초기 점검의 1~6번 순서로 개선했다. 초기 audit 표는 변경 전 기록이며 현재 상태는 이 절을 기준으로 본다.

후속 빌드 성능 개선의 변경 내용과 측정 결과는 [BUILD_PERFORMANCE.md](BUILD_PERFORMANCE.md)를 참고한다.

| 단계 | 적용 내용 |
| --- | --- |
| 1. 외부 노출 축소 | Vite 개발·미리보기와 API listen을 127.0.0.1로 제한. API는 localhost/127.0.0.1의 4171·5173·3000·기본 HTTP 포트 출처만 허용하고, Origin 없는 Node 테스트 요청은 허용. 허용하지 않은 Origin은 변경 요청도 403으로 거부 |
| 1. 업로드 제한 | 파일당 10MB, 요청당 파일 10개·필드 50개·필드당 64KB·전체 part 60개. Multer 제한 오류는 JSON 413, 예상하지 않은 파일 필드는 400, 잘못된 JSON은 400으로 처리. 실패 시 저장 파일 정리를 테스트로 확인 |
| 2. 의존성 정리 | init·ink-docstrap·TSLint·사용하지 않는 ESLint 구성/타입/아이콘·PostCSS/Visualizer plugin·ts-loader 제거. Express를 devDependencies로 이동. 브라우저 dependencies에는 tslib만 유지 |
| 2. 복사 도구 교체 | cpx와 rimraf를 제거하고 scripts/build-files.mjs의 Node fs로 선언·비압축 파일·HTML 복사와 중간 디렉터리 정리를 수행. 출력 링크를 거부하고 production 파일 보존을 테스트 |
| 3. 설정 전환 | Vite 설정 3개를 .mjs로 전환, import.meta.url로 경로 계산, Sass modern API 지정. 배너 plugin 대신 Rollup output.banner로 라이선스 배너 유지. package scripts·harness 참조 갱신 |
| 4. 지원 버전 이관 | Vite 7.3.7, Rollup 4.65.1, Express 4.22.3, Multer 2.5.0, Jest/jsdom 환경 30.5.2, ts-jest 29.4.15로 이관. 호환 범위 내 전이 의존성도 다시 해결 |
| 5. npm 통일 | scripts의 Yarn 호출 제거, package-lock.json ignore 해제, packageManager npm@12.2.1 명시. CI는 Node 24.20.0/npm 12.2.1과 npm ci 사용 |
| 6. 회귀 검증 | 전체 Jest·타입·Sass·production/development ES/CJS·UMD·선언·트리셰이킹 검증. scripts/package-smoke.mjs로 실제 npm pack의 prepack과 별도 소비자 설치·ESM/CJS import 검사 |

추가로 API가 multipart 요청의 Content-Type을 JSON 응답에 반영하던 문제를 수정했다. 응답 헤더 복사는 테스트용 X-* 헤더로 제한하여 Content-Type과 CORS 정책이 요청 헤더로 덮어써지지 않도록 했다.

### 변경 후 보안 상태

| npm audit 범위 | 변경 전 | 변경 후 |
| --- | --- | --- |
| 전체 | 59개: Critical 4 / High 27 / Moderate 17 / Low 11 | 6개: Low 6, 나머지 0 |
| --omit=dev | 14개: Critical 1 / High 8 / Moderate 4 / Low 1 | 0개 |

남은 6개는 `deepmerge` 하나의 advisory와 그 영향을 받는 `jest-config`, `@jest/core`, `jest-cli`, `jest`, `ts-jest` 경로다. 취약 입력을 병합할 때 반환 객체의 prototype을 오염시킬 수 있으며, 현재 공식 권고에는 수정 버전이 없다. 이 저장소의 Jest 설정과 테스트는 저장소 코드로 관리하며 외부 사용자가 제공한 설정을 받지 않는다. 브라우저 production 의존성에는 해당 패키지가 포함되지 않는다. Jest 25로 내리는 audit fix --force나 호환성을 확인하지 않은 override는 적용하지 않았다. 상위 패키지의 수정 릴리스를 추적해야 한다. [deepmerge 보안 권고](https://github.com/advisories/GHSA-gcqx-w48m-w2h4)

Vite CJS Node API와 Sass legacy API 빌드 경고는 해소했다. 설치 단계에는 테스트 도구의 `test-exclude → glob 10.5.0`, `jsdom → whatwg-encoding 3.1.1` deprecated 메타데이터가 남아 있다. 현재 audit에서 두 경로의 알려진 취약점은 보고되지 않으며, 상위 패키지의 교체를 기다리는 항목이다. deprecated와 취약점은 구분한다.

Vite 7.3은 공식 지원 중이며 Node 20.19+/22.12+가 필요하다. 빌드 타깃은 Chrome/Edge/Firefox 109·Safari 16.3으로 명시해 업그레이드 시 기본 타깃 변경의 영향을 제한했다. 이는 문법 변환 기준이며, 기존 formatMessage의 lookbehind 때문에 Safari 16.3에서 해당 함수를 사용할 수 없다는 이전 점검 결과는 여전히 유효하다. 실제 구버전 브라우저 실행 검증은 별도다. [Vite 지원 정책](https://vite.dev/releases), [Vite 7 이관 안내](https://v7.vite.dev/guide/migration)

### 재현 방법

```sh
npm ci
npm run verify
npm run test:scripts
npm run test:package
npm audit --json
npm audit --omit=dev --json
```

`test:package`는 실제 prepack을 실행하므로 dist를 다시 생성하며 npm publish는 실행하지 않는다. CI 설정은 추가했으나 원격 CI 실행 결과는 아직 확인하지 않았다. 변경 후 audit JSON·검증 로그·패키지와 소비자 파일은 추적하지 않는 test-results에 남긴다.

최종 검증은 Node 24.20.0/npm 12.2.1에서 수행했다.

- `npm ci` 재설치 성공. 이후 `npm run verify`와 `npm run test:scripts` 종료 코드 0.
- Jest 29개 suite/278개 테스트 통과. 이 중 새 API 보안 테스트 8개가 포함된다.
- `npm ls --all` 종료 코드 0. 기본 Jest 설정으로 새 API 테스트를 별도 실행하여 설치된 HTML reporter의 Jest 30 연동도 확인했다.
- Node 스크립트 테스트 9개 통과. 이 중 새 파일 복사·정리 테스트 3개가 포함된다.
- 타입·Sass·네 가지 빌드·선언 생성 통과. ESM 최소 소비자 번들 103바이트.
- 실제 prepack과 npm pack 성공, 배포 파일 82개 확인, 별도 소비자 설치 후 ESM/CJS import 통과.
- 최종 전체 audit Low 6개, production audit 0개. 실제 2023년 브라우저와 원격 CI는 미검증.

## 초기 점검 기록 — 아래 내용은 개선 전 상태

## 결론과 범위

빌드는 성공하지만 deprecated 경고 2종과 알려진 의존성 취약점이 있다. deprecated는 사용 중단 예정 또는 지원 종료를 뜻하며, 그 경고 자체가 취약점이라는 뜻은 아니다. 반대로 경고 없이 빌드되어도 npm audit에서 취약점이 보고될 수 있다.

현재 package-lock.json을 npm 공식 advisory API와 대조했다. 전체는 취약 패키지 항목 59개(critical 4, high 27, moderate 17, low 11), --omit=dev는 14개(critical 1, high 8, moderate 4, low 1)다. 이는 고유 CVE 개수나 이 프로젝트에서 실제 공격 가능한 경로의 개수가 아니다. 원인 패키지와 영향을 받는 상위 패키지가 함께 계산될 수 있다.

설치된 node_modules와 lockfile의 버전·배치가 다르다. 예를 들어 sass는 설치 1.81.0/lock 1.96.0, TypeScript는 5.6.3/5.9.3이며 HTML reporter는 lockfile에만 있다. 전체 취약점 수는 lockfile 기준이고, 주요 위험 패키지는 설치 버전도 별도로 확인했다.

초기 점검 당시에는 분석·문서화만 수행했다. 당시 소스·빌드 설정·의존성을 수정하거나 패키지를 설치하지 않았다. 산출물을 별도 위치에 생성해 production/development ESM/CJS·UMD 빌드, 선언 생성, ESM 트리셰이킹이 통과하는 것과 경고 재현을 확인했다. 실제 공격 재현이나 침투 테스트는 수행하지 않았다.

## 빌드에서 재현한 deprecated 경고

| 항목 | 원인 | 개선 |
| --- | --- | --- |
| Vite CJS Node API deprecated | package.json에 type:module이 없고 vite*.js 설정이 CJS 경로로 로드됨 | Vite 설정 3개를 .mjs로 전환하고 상호 import·package scripts·harness의 설정 경로를 함께 변경. __dirname은 fileURLToPath(import.meta.url)로 계산 |
| Sass legacy JS API deprecated | Vite 5.4에서 SCSS api 지정 없이 legacy API 사용 | vite.common의 css.preprocessorOptions.scss에 api:'modern' 지정. Sass 2.0에서 legacy API가 제거될 예정 |

Jest 설정이 CommonJS이고 배포 .js의 해석에도 영향이 있으므로 package.json에 type:module만 추가하는 일괄 전환은 권하지 않는다. 설정 파일만 .mjs로 전환하면 영향을 줄일 수 있다. 경고 숨김 옵션은 근본 해결이 아니다.

근거: [Vite 5 ESM 전환 안내](https://v5.vite.dev/guide/migration.html#deprecate-cjs-node-api), [Sass legacy API 이관](https://sass-lang.com/documentation/breaking-changes/legacy-js-api/).

## 우선순위가 높은 보안 항목

| 우선순위 | 설치 상태·경로 | 영향과 조치 |
| --- | --- | --- |
| P0 | Vite 5.4.21 → esbuild 0.21.5, vite.common host:0.0.0.0 | 개발 서버 파일 접근·Windows 경로/에디터 관련 advisory 존재. loopback으로 노출을 제한하고 지원되는 패치 버전으로 이관. localhost 제한만으로 모든 브라우저 기반 공격이 해결되지는 않음 |
| P0 | Rollup 4.53.3 | 공격자가 출력 파일명을 통제하는 입력·plugin에서 경로 조작을 통한 파일 쓰기 가능. 해당 advisory의 수정은 4.59.0. 현재 고정 출력 이름만으로 공격 경로를 입증한 것은 아님 |
| P0 | Express 4.22.1의 proxy-addr 2.0.7 | audit critical. 잘못 구성된 IPv4-mapped IPv6 trust subnet에서 IP 위조. 수정 2.0.8. 현재 테스트 API에는 trust proxy 설정이 없어 해당 공격 전제는 확인되지 않음 |
| P1 | Multer 2.0.2, api/server.ts의 multer({storage}) | 여러 upload DoS advisory에 해당. 2026-10-22 advisory 수정은 2.5.0이며 async fileFilter 조건임. 현재 코드에는 해당 필터가 없지만 이전 취약점과 upload 용량 제한 부재는 별도 검토 필요 |
| P1 | ts-jest → handlebars 4.7.8 | audit critical인 코드 주입 관련 advisory. 신뢰하지 않는 템플릿/AST 처리 조건을 검토하고 호환 가능한 패치 버전으로 갱신. 브라우저 런타임 취약점으로 단정하지 않음 |
| P1 | concurrently/cpx → shell-quote 1.8.3 | audit critical. 공격자 입력이 셸 인용 경로에 들어갈 때 명령 주입 위험. 현재 dev 명령은 고정 문자열이므로 외부 입력 경로는 확인되지 않음. 상위 의존 갱신 및 cpx 제거로 정리 |
| P1 | ts-loader → webpack → terser-webpack-plugin → serialize-javascript 6.0.2 | audit high. 현재 Vite 빌드에서 ts-loader 사용처를 찾지 못했으므로 불필요 의존 제거 우선 |
| P1 | dependencies의 ink-docstrap 1.3.2 → sanitize-html 1.27.5 | 오래된 sanitizer와 PostCSS 등이 소비자 의존성에 포함됨. 현재 문서 도구는 TypeDoc이며 ink-docstrap 사용처를 찾지 못했으므로 제거 후보 |
| P2 | cpx 1.5.0 → chokidar 1.x → 오래된 micromatch/braces | 실제 copy-* 빌드 스크립트가 사용. Node fs 기반 복사 스크립트로 교체해 오래된 watcher 의존 그래프 제거 |

근거: [Vite 보안 권고](https://github.com/vitejs/vite/security/advisories), [Rollup 파일 쓰기 권고](https://github.com/rollup/rollup/security/advisories/GHSA-mw96-cpmx-2vgc), [proxy-addr 권고](https://github.com/advisories/GHSA-jqcg-44mw-7w3h), [Multer 권고](https://github.com/expressjs/multer/security/advisories/GHSA-q7qp-rjg7-q26m), [Handlebars 권고](https://github.com/advisories/GHSA-8r5x-fm3f-whwj), [shell-quote 권고](https://github.com/advisories/GHSA-w7jw-789q-3m8p).

Rollup은 audit가 high로 집계한 반면 연결된 유지관리자 권고는 moderate로 표시한다. 도구별 평가 차이가 있으므로 원인·공격 전제·수정 버전을 함께 본다.

## 배포 의존성 정리

브라우저 src에서 Express·TSLint·ink-docstrap을 사용하는 import는 없다. 이들이 브라우저 번들에 그대로 포함된다고 볼 근거는 없지만 dependencies에 있으므로 소비자 설치 그래프에는 영향을 준다.

- `init`, `ink-docstrap`, `tslint`, `tslint-config-prettier`: 실제 소스·설정·scripts에서 사용처를 찾지 못했다. 제거 우선 후보다.
- `express`: api/의 테스트·개발 서버에서만 사용하므로 devDependencies 이동 후보다. 이는 API 서버 취약점의 수정 자체는 아니다.
- `tslib`: importHelpers 설정과 관련될 수 있으므로 유지한 채 실제 배포 산출물의 외부 참조를 확인한다.
- `rollup-plugin-postcss`, `ts-loader`: 현재 Vite 설정에서 사용하지 않는다. 제거하면 CSS 최적화·Webpack 관련 오래된 전이 의존성을 줄일 수 있다.
- `eslint-config-airbnb`, React 관련 lint 의존성 등도 실제 ESLint 설정이 사용하는지 확인하고 정리한다. 이름만 보고 일괄 제거하지 않는다.

현재 소스의 `src/utils/sanitizeHtml.ts`는 자체 구현이며 취약 패키지 `sanitize-html`을 import하지 않는다. npm audit의 sanitizer 경고를 자체 함수의 취약점과 혼동하지 않는다. 반대로 자체 sanitizer는 npm audit로 보안성을 검증할 수 없다.

## 지원 종료·오래된 패키지

- TSLint 6.1.3은 ESLint로 이관하도록 deprecated 처리됐다. 현재 코드에서 사용처를 찾지 못했다.
- ESLint 8.57.1은 지원 종료 상태다. 현재 공식 지원 정책은 v10을 Current로 표시하므로 이관 시 typescript-eslint·Node·설정 형식의 호환성을 함께 검토한다. 오래된 Airbnb/React 구성을 기계적으로 가져오지 않는다.
- glob 7, inflight 1, core-js 2, chokidar 1/오래된 fsevents, 구형 source-map 도구는 주로 cpx·TSLint·구형 plugin의 전이 의존성이다. 개별 패키지를 억지로 override하기 전에 상위 도구를 제거·대체한다.
- baseline-browser-mapping의 데이터 노후 경고는 deprecated 경고와 다르다. 하지만 현재 audit에는 별도의 DoS advisory도 있으므로 단순 경고 숨김으로 끝내지 않는다.

근거: [TSLint 이관 계획](https://github.com/palantir/tslint/issues/4534), [ESLint 지원 정책](https://eslint.org/version-support/), [Vite 지원 버전 정책](https://vite.dev/releases).

## 권장 진행 순서

1. **외부 노출 축소:** Vite host를 127.0.0.1로 제한한다. api/index의 listen도 개발 용도에 맞게 loopback에 바인딩한다. 업로드 최대 파일 크기·필드 수·파일 수와 에러 처리·CORS 범위를 정한다.
2. **불필요한 의존 제거·분리:** init·TSLint·ink-docstrap과 사용하지 않는 빌드 plugin을 정리하고 Express는 개발 의존으로 옮긴다. cpx의 copy-dts/copy-unmin/copy-html은 Node fs 스크립트로 대체한다.
3. **최소 설정 변경:** Vite 설정만 .mjs로 전환하고 Sass modern API를 지정한다. 스크립트·하네스 참조도 갱신한다.
4. **패치/지원 버전 이관:** Express/Multer와 전이 의존을 갱신한다. Vite 5는 현재 지원 대상이 아니므로 공식 이관 가이드를 따라 지원되는 버전으로 이동한다. audit가 제시한 Vite 8.3.5는 검토 후보이며 plugin·Node·ES/CJS·UMD 호환 검증 전 확정하지 않는다.
5. **lockfile 일원화:** package-lock.json이 현재 .gitignore에 있고 scripts는 yarn을 호출한다. npm 또는 Yarn 한 가지로 결정한 뒤 해당 lockfile을 추적하고 동일 버전으로 CI 설치를 고정한다. 기존 node_modules/lockfile 불일치를 해소한 뒤 다시 audit한다.
6. **회귀 검증:** 전체 Jest·타입·Sass·4가지 빌드·선언·트리셰이킹, 실제 npm pack 내용과 clean 소비자 ESM/CJS import, dev API upload/timeout을 확인한다. 전체/production audit를 모두 다시 실행한다.

`npm audit fix --force`를 일괄 적용하지 않는다. 이번 audit는 Jest 25.1.0, ts-jest 25.5.1, cpx 1.2.1, ink-docstrap 0.5.4로 내리는 경로까지 제시했다. audit 점수를 낮추는 선택과 안전하고 유지 가능한 업그레이드는 다를 수 있다. overrides는 상위 패키지 호환성을 확인한 전이 의존에만 제한적으로 사용한다.

## 재확인 명령

```sh
npm audit --json
npm audit --omit=dev --json
npm explain shell-quote
npm explain handlebars
npm explain cpx
node scripts/harness.mjs build
```

원본 audit JSON과 빌드 로그는 추적하지 않는 test-results에 저장했다. 다음 부록은 이번 lockfile/API 결과를 요약한 스냅샷이며 최신 버전의 안전성을 보증하지 않는다.

## Appendix: audit snapshot

| Package | Locked versions | Severity | Direct | Production audit |
| --- | --- | --- | --- | --- |
| concurrently | 9.2.1 | critical | yes | no |
| handlebars | 4.7.8 | critical | no | no |
| proxy-addr | 2.0.7 | critical | no | yes |
| shell-quote | 1.8.3 | critical | no | no |
| @isaacs/brace-expansion | 5.0.0 | high | no | no |
| body-parser | 1.20.4 | high | no | yes |
| brace-expansion | 1.1.12, 2.0.2 | high | no | yes |
| braces | 1.8.5, 2.3.2 | high | no | no |
| browserslist | 4.28.1 | high | no | no |
| fast-uri | 3.1.0 | high | no | no |
| flatted | 3.3.3 | high | no | no |
| form-data | 4.0.5 | high | no | no |
| immutable | 5.1.4 | high | no | no |
| js-yaml | 3.14.2, 4.1.1 | high | no | yes |
| linkify-it | 5.0.0 | high | no | no |
| lodash | 4.17.21 | high | no | yes |
| markdown-it | 14.1.0 | high | no | no |
| micromatch | 2.3.11, 3.1.10 | high | no | no |
| minimatch | 9.0.5, 3.1.2, 10.1.1 | high | no | yes |
| multer | 2.0.2 | high | yes | no |
| nanoid | 3.3.11 | high | no | no |
| path-to-regexp | 0.1.12 | high | no | yes |
| picomatch | 4.0.3, 2.3.1 | high | no | no |
| postcss | 8.5.6, 7.0.39 | high | no | yes |
| rollup | 4.53.3 | high | no | no |
| sanitize-html | 1.27.5 | high | no | yes |
| serialize-javascript | 6.0.2 | high | no | no |
| source-map-js | 1.2.1 | high | no | no |
| svgo | 2.8.0 | high | no | no |
| vite | 5.4.21 | high | yes | no |
| ws | 8.18.3 | high | no | no |
| ajv | 6.12.6, 8.17.1 | moderate | no | no |
| anymatch | 1.3.2 | moderate | no | no |
| baseline-browser-mapping | 2.9.6 | moderate | no | no |
| chokidar | 1.7.0 | moderate | no | no |
| colord | 2.9.3 | moderate | no | no |
| cpx | 1.5.0 | moderate | yes | no |
| decode-uri-component | 0.2.2 | moderate | no | no |
| esbuild | 0.21.5 | moderate | no | no |
| express | 4.22.1 | moderate | yes | yes |
| ink-docstrap | 1.3.2 | moderate | yes | yes |
| moment | 2.30.1 | moderate | no | yes |
| postcss-selector-parser | 7.1.1, 6.1.2 | moderate | no | no |
| qs | 6.14.0 | moderate | no | yes |
| readdirp | 2.2.1 | moderate | no | no |
| source-map-resolve | 0.5.3 | moderate | no | no |
| terser-webpack-plugin | 5.3.15 | moderate | no | no |
| yaml | 2.8.2, 1.10.2 | moderate | no | no |
| @babel/core | 7.28.5 | low | no | no |
| @jest/core | 29.7.0 | low | no | no |
| @tootallnate/once | 2.0.0 | low | no | no |
| create-jest | 29.7.0 | low | no | no |
| deepmerge | 4.3.1 | low | no | no |
| diff | 4.0.2 | low | no | yes |
| jest | 29.7.0 | low | yes | no |
| jest-cli | 29.7.0 | low | no | no |
| jest-config | 29.7.0 | low | no | no |
| ts-jest | 29.4.6 | low | yes | no |
| webpack | 5.103.0 | low | no | no |

## Appendix: deprecated lock entries

| Package path | Version | Deprecated metadata |
| --- | --- | --- |
| node_modules/@humanwhocodes/config-array | 0.13.0 | Use @eslint/config-array instead |
| node_modules/@humanwhocodes/object-schema | 2.0.3 | Use @eslint/object-schema instead |
| node_modules/abab | 2.0.6 | Use your platform's native atob() and btoa() methods instead |
| node_modules/core-js | 2.6.12 | core-js@<3.23.3 is no longer maintained and not recommended for usage due to the number of issues. Because of the V8 engine whims, feature detection in old core-js versions could cause a slowdown up to 100x even if nothing is polyfilled. Some versions have web compatibility issues. Please, upgrade your dependencies to the actual version of core-js. |
| node_modules/domexception | 4.0.0 | Use your platform's native DOMException instead |
| node_modules/eslint | 8.57.1 | This version is no longer supported. Please see https://eslint.org/version-support for other options. |
| node_modules/flat-cache/node_modules/rimraf | 3.0.2 | Rimraf versions prior to v4 are no longer supported |
| node_modules/fsevents | 1.2.13 | Upgrade to fsevents v2 to mitigate potential security issues |
| node_modules/glob | 7.2.3 | Glob versions prior to v9 are no longer supported |
| node_modules/inflight | 1.0.6 | This module is not supported, and leaks memory. Do not use it. Check out lru-cache if you want a good and tested way to coalesce async requests by a key value, which is much more comprehensive and powerful. |
| node_modules/node-domexception | 1.0.0 | Use your platform's native DOMException instead |
| node_modules/resolve-url | 0.2.1 | https://github.com/lydell/resolve-url#deprecated |
| node_modules/source-map-resolve | 0.5.3 | See https://github.com/lydell/source-map-resolve#deprecated |
| node_modules/source-map-url | 0.4.1 | See https://github.com/lydell/source-map-url#deprecated |
| node_modules/stable | 0.1.8 | Modern JS already guarantees Array#sort() is a stable sort, so this library is deprecated. See the compatibility table on MDN: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/sort#browser_compatibility |
| node_modules/tslint | 6.1.3 | TSLint has been deprecated in favor of ESLint. Please see https://github.com/palantir/tslint/issues/4534 for more information. |
| node_modules/urix | 0.1.0 | Please see https://github.com/lydell/urix#deprecated |
