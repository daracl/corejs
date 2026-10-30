# Daracl Core

브라우저용 JavaScript 코어 라이브러리입니다. Ajax, Loading, DOM·이벤트·문자열·객체 유틸리티를 제공합니다.

[![npm version](https://img.shields.io/npm/v/@daracl/core)](https://www.npmjs.com/package/@daracl/core)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](./LICENSE)

## 설치

```bash
npm install @daracl/core
```

## 사용

### ESM / CommonJS

```ts
import { Ajax, Loading, AjaxError } from "@daracl/core";
import "@daracl/core/dist/daracl.core.min.css"; // 선택: Loading 은 인라인 스타일로 표시되어 CSS 없이도 동작합니다

const ajax = Ajax.create({ baseUrl: "/api", enableDefaultLoader: true });

try {
  const { data } = await ajax.get("/items", { params: { page: 1 } });
} catch (error) {
  if (error instanceof AjaxError && error.type === "http") console.error(error.status);
}
```

유틸리티만 필요하면 별도 진입점을 사용합니다.

```ts
import { objectDeepMerge, debounce } from "@daracl/core/utils";
```

### 브라우저 (UMD)

```html
<link rel="stylesheet" href="https://unpkg.com/@daracl/core/dist/daracl.core.min.css" />
<script src="https://unpkg.com/@daracl/core/dist/daracl.core.min.umd.js"></script>
<script>
  const ajax = Daracl.ajax.create({ baseUrl: "/api" });
  const loading = new Daracl.loading("body");
  // Daracl.AjaxError, Daracl.utils, Daracl.core.dom, Daracl.core.event 도 사용할 수 있습니다.
</script>
```

## 문서

- [Ajax 옵션과 오류 처리](./docs/AJAX_OPTIONS.md): 전송 방식(fetch/xhr), 진행률, `rawBody`, 오류 타입
- [유틸리티 이관 기록](./docs/UTILS_MIGRATION.md)
- [프로젝트 점검 기록](./docs/PROJECT_REVIEW.md)

## 지원 브라우저

빌드 대상은 Chrome 109+, Edge 109+, Firefox 109+, Safari 16.3+ 입니다.

## 개발

```bash
npm ci
npm test                          # Jest (jsdom)
node scripts/harness.mjs verify   # 타입·테스트·SCSS·번들·선언·트리셰이킹 검증
npm run build                     # dist 생성
npm run clean:results             # 7일이 지난 검증 산출물(test-results) 정리
```

작업 지침은 [AGENTS.md](./AGENTS.md), 검증 도구 사용법은 [docs/HARNESS.md](./docs/HARNESS.md)를 참고하세요.

## 저장소

[github.com/daracl/corejs](https://github.com/daracl/corejs)

## License

[MIT](./LICENSE)
