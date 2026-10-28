# corejs 작업 하네스

`ui-common-harness`의 프로젝트 지침, 작업 흐름, 코드·설정 기준과 SCSS 훅을 corejs에 맞게 적용한 작업 하네스다.

## 구성

| 파일 | 역할 |
| --- | --- |
| `AGENTS.md` | Codex 등 에이전트의 프로젝트 구조·코드·호환성·검증 지침 |
| `CLAUDE.md` | AGENTS.md를 가져오는 Claude Code 진입점 |
| `.claude/settings.json` | 점검 실행 허용, dist 직접 수정·publish·push·강제 초기화 제한, SCSS 훅 연결 |
| `.claude/hooks/style-check.mjs` | style/의 SCSS를 수정하면 파일 생성 없이 Sass 컴파일 |
| `.claude/commands/audit-core.md` | Claude Code 점검 명령 |
| `.claude/commands/verify-core.md` | Claude Code 검증 명령 |
| `scripts/harness.mjs` | 에이전트 없이도 실행하는 검증 CLI |
| `scripts/harness.test.mjs` | CLI 인자·경로·Node 재사용·훅 성공/실패 검증 |

## 실행

프로젝트 루트에서 실행한다. 추가 의존성은 설치하지 않으며 package.json의 기존 scripts는 변경하지 않았다.

```powershell
node scripts/harness.mjs audit
node scripts/harness.mjs audit --json
node scripts/harness.mjs typecheck
node scripts/harness.mjs scss
node scripts/harness.mjs test
node scripts/harness.mjs test test/ajax/options.test.ts
node scripts/harness.mjs build
node scripts/harness.mjs verify
node --test scripts/harness.test.mjs
```

`verify`는 점검 → 타입 검사 → 전체 Jest → 네 가지 Vite 빌드 → 선언 생성 → 최소 소비자 ESM 번들 검증 순서로 진행하며 실패하면 중단한다. 오류는 종료 코드 1, 경고는 보고하고 계속한다. SCSS 훅은 편집과 무관한 파일·잘못된 JSON 입력에서는 종료 코드 0, 컴파일 오류에서는 2를 반환한다.

## 공통 기준과 corejs의 차이

| 공통 하네스 | corejs 적용 |
| --- | --- |
| 11개 ui 프로젝트를 대상으로 설정 파일에 등록 | corejs는 미등록. 공통 설정을 수정하지 않고 단일 프로젝트 CLI 제공 |
| ui-style 토큰·접두사·의존성 점검 | corejs는 ui-style 의존성이 없다. style/daracl.scss를 Sass로 컴파일하며 ui-style 도입을 강제하지 않음 |
| ui-grid 기준 포맷·설정 템플릿 배포 | 기존 .prettierrc·tsconfig·Jest·Vite 유지. 특히 corejs의 tsconfig.test.json을 제거하지 않음 |
| 프로젝트 임시 사본에서 임의 명령 실행 | 현재 Vite 설정은 CLI outDir를 지원하므로 고정 검증 명령만 직접 실행하고 매번 새로운 test-results/harness/run-*로 출력 |
| 여러 프로젝트의 의존·배포 순서 분석 | 이 저장소에 불필요. corejs의 Ajax·Loading·유틸·ESM/UMD 계약에 집중 |
| 스킬·서브에이전트 자동화 | 프로젝트 명령 두 개 제공. 자동 위임·서브에이전트 실행 없음 |

공통 기준은 ui-common-harness의 CODING-STANDARDS.md와 CONFIG-STANDARDS.md를 참고한다. 하네스 실행은 공통 하네스의 디렉터리 위치에 의존하지 않는다.

## 점검 내용과 한계

- `audit`: 패키지 필드·스크립트, 도구 설치, npm/yarn 혼재, file: 의존, 배포 UMD/CSS sideEffects 패턴, 실제 배포 진입 파일 유무, strict·TypeScript/Jest 별칭, 소스 충돌 표시, 타입 검사 우회 주석, SCSS 컴파일을 점검한다. 코드 정적 분석 전체나 보안 취약점 검사는 아니다.
- Jest: 중복 수집을 피하는 기존 test:all 패턴과 `--runInBand`를 사용한다. reporter는 default를 사용한다. API 업로드는 test-results/uploads에 저장한다.
- 빌드: ESM/CJS 및 UMD의 production/development 네 조합과 타입 선언 생성을 검증한다. dist/unmin 병합·public HTML 복사·수기 .d.ts 복사·npm pack·publish는 수행하지 않는다. 따라서 배포 패키지 완전성은 별도 검증이 필요하다.
- 트리셰이킹: 새 production ESM을 Rollup 소비자로 가져와 isString만 사용한다. Ajax·내장 GIF·전역 등록이 남거나 2 KiB를 초과하면 실패한다. 일반적인 회귀 감지용이며 모든 export·CJS·소비자 번들러에 대한 보장은 아니다.
- 경로: 실행 위치에 의존하지 않고 스크립트 기준으로 프로젝트를 찾는다. 산출물 상위 경로가 symlink/junction이면 중단한다. 임의 셸 명령, 의존성 설치, 파일 삭제를 제공하지 않는다.
- CLI는 현재 설정을 신뢰하고 실행한다. 향후 Vite plugin이 별도 파일을 생성하도록 바뀌면 출력 위치를 검토하거나 공통 하네스의 임시 사본 방식으로 전환해야 한다. Claude 권한은 도구 접근 제한이며 스크립트의 보안 샌드박스를 대신하지 않는다.
- Claude 호스트에서 명령 메뉴·권한·자동 훅이 실제 실행되는지에 대한 UI 검증은 별도다. Node로 CLI·훅을 직접 실행해 검증할 수 있다.

