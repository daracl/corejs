corejs의 구조·설정·도구 설치 상태를 점검한다.

1. AGENTS.md와 docs/HARNESS.md를 읽는다.
2. git status --short와 git log -3 --oneline으로 사용자 변경을 확인한다.
3. node scripts/harness.mjs audit를 실행한다.
4. 오류·경고·검증 한계를 구분해 보고한다. 점검만 요청했으면 소스·설정을 자동 수정하지 않는다.
