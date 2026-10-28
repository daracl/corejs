# corejs Claude Code 하네스

@AGENTS.md

작업 지침은 AGENTS.md를 공유하며, 명령과 공통 하네스 대비 차이는 HARNESS.md를 따른다.

- `/audit-core`: 설정·도구·소스 충돌·SCSS 점검
- `/verify-core`: 타입·테스트·SCSS·ES/CJS·UMD·선언·ESM 트리셰이킹 검증
- `.claude/hooks/style-check.mjs`: style/의 SCSS 수정 후 메모리 컴파일

공통 하네스의 설치기가 만든 파일은 아니다. `ui-common-harness install --update`의 관리 대상으로 표시하지 않는다. 기존 프로젝트 설정과 사용자 변경은 유지한다.
