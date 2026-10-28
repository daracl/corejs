# 빌드 설정 점검 (2026-10-28)

- Rollup의 deprecated assetInfo.name을 names로 교체하고 이름 없는 자산 처리를 검증했다.
- 하네스의 Vite CLI 5회 실행을 기존 배포 빌드와 같은 Vite API 실행기로 통합했다. 타입 선언과 utils 번들을 병행하며, 같은 CSS를 출력하는 ES/CJS·UMD는 순차 실행한다. 실패 시에도 모든 작업이 끝나기를 기다린다.
- dev:server의 npx를 제거해 미설치 도구를 즉석 다운로드하지 않고 설치된 ts-node만 사용한다.
- npm run audit:security는 런타임, npm run audit:security:all은 개발 의존성까지 검사한다.

변경 후 하네스 빌드는 Node 24.20.0에서 타입 선언·트리셰이킹 포함 1회 3.385초였다. 통제된 전후 반복 측정이 아니므로 개선율을 제시하지 않는다. JS/CSS/타입 선언 65개는 변경 전후 내용이 일치했다. 소스맵은 출력 경로가 달라 비교에서 제외했다. 스크립트 테스트 11개, 타입 검사, ESM 트리셰이킹(103바이트), prepack 빌드·npm pack·별도 ESM/CJS 소비자 검사(86개 파일)가 통과했다. 전체 Jest 및 실제 브라우저 수동 검증은 실행하지 않았다.

런타임 감사는 취약점 0건이다. 전체 감사는 Jest 경유 deepmerge 취약점 1종이 의존 패키지 6개에 low로 집계된다. [공식 advisory](https://github.com/advisories/GHSA-gcqx-w48m-w2h4)에 현재 수정 버전이 없어 npm의 Jest 25 강제 하향 제안은 적용하지 않았다.

설치 deprecation은 test-exclude → glob 10, jest-environment-jsdom → jsdom → whatwg-encoding 경로에 남아 있다. 전이 의존성을 다른 major로 강제 교체하거나 경고를 숨기지 않았으며 상위 도구의 호환 업데이트가 필요하다. Vite ESM 설정, Sass modern API, loopback 서버 바인딩은 이미 적용되어 있어 유지했다. 소스맵도 기존 디버깅 계약을 유지한다.
