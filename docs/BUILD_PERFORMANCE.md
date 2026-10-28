# 빌드 성능 개선

측정일: 2026-10-28. 대상: @daracl/core 0.0.6. Node 24.20.0/npm 12.2.1에서 실제 `npm run build`를 개선 전후 각각 두 번 실행했다. OS 캐시를 초기화하지 않은 동일 작업 환경의 측정이며 다른 환경의 소요 시간은 달라질 수 있다.

## 측정 결과

| 전체 npm run build | 개선 전 | 개선 후 |
| --- | --- | --- |
| 1회 | 12.553초 | 4.410초 |
| 2회 | 10.824초 | 6.261초 |
| 평균 | 11.689초 | 5.336초 |

평균 소요 시간이 약 54% 줄었다. 측정에는 npm 실행, 네 가지 Vite 빌드, 타입 선언 생성과 파일 병합·복사·정리가 모두 포함된다. 별도 검증을 동시에 실행하기 전에 측정했다.

## 적용 내용

- `npm run build`를 `scripts/build.mjs` 한 번으로 실행한다. 여러 npm 스크립트의 중첩 호출과 Vite CLI 프로세스 네 번의 시작 비용을 줄였다.
- Vite의 JavaScript API에 기존 설정을 직접 전달한다. 설정 파일을 빌드마다 다시 번들링하지 않고 재사용한다. [Vite JavaScript API](https://v7.vite.dev/guide/api-javascript)
- 타입 선언은 별도의 Node 프로세스에서 생성하고 Vite 빌드와 병행한다. 선언과 번들이 모두 성공했을 때 파일을 병합하며, 어느 한쪽이 실패하면 전체 빌드가 실패한다.
- 출력 디렉터리는 시작 시 한 번 정리한다. Vite 빌드는 같은 출력에 쓰는 충돌을 피하도록 production ES/CJS → production UMD → development ES/CJS → development UMD 순서로 실행한다.
- Vite의 반복 public 디렉터리 복사를 생략하고 마지막에 HTML을 한 번 복사한다.
- `reportCompressedSize: false`로 gzip 크기 통계 계산을 생략한다. [Vite build 옵션](https://v7.vite.dev/config/build-options#build-reportcompressedsize)

타입 선언과 번들 작업을 겹쳐 실행하므로 CPU·메모리 사용이 한 시점에 집중될 수 있다. Vite 네 작업 자체는 순차 실행한다. 기존 `build:escjs`, `build:umd`, `mergenclean` 명령은 개별 작업용으로 유지한다.

## 검증

- 개선 전후 dist 산출물 74개의 파일 목록과 SHA-256이 모두 일치했다. JS·CSS·타입 선언·소스맵이 포함된다.
- 출력 정리의 링크 거부·원본 파일 보존 테스트를 포함해 Node 스크립트 테스트 10개가 통과했다.
- 하네스로 네 가지 빌드·타입 선언·ESM 트리셰이킹을 검증한다. 실제 prepack과 npm pack, 별도 소비자 ESM/CJS import도 검증한다.

측정 로그·기존 산출물 사본·타이밍 JSON은 추적하지 않는 `test-results/build-performance-*`에 저장한다. 재현 명령:

```sh
npm run build
npm run test:scripts
node scripts/harness.mjs build
npm run test:package
```

`npm run build`와 `test:package`는 dist를 다시 생성한다. 하네스의 build는 test-results에 별도 산출물을 생성한다.
