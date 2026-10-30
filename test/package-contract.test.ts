import { readFileSync } from "fs";

const pkg = JSON.parse(readFileSync("package.json", "utf8"));

describe("패키지 계약", () => {
  it("전역 등록 파일(src/global.ts, src/index.umd.ts 외)은 sideEffects 에 포함하지 않는다", () => {
    // src/index.ts 의 import "./global" 이 배포 ESM 번들에서 제거되는 것은 sideEffects 에서 제외되기 때문이다
    const effects: string[] = pkg.sideEffects;
    expect(Array.isArray(effects)).toBe(true);
    expect(effects.some(pattern => /(^|\/)global(\.ts|\.js)?$/.test(pattern))).toBe(false);
    expect(effects).toEqual(expect.arrayContaining(["./dist/*.umd.js", "./dist/*.css"]));
    expect(effects).not.toContain("./dist/*.js");
    expect(effects).not.toContain("./dist/index.js");
  });

  it("브라우저 라이브러리는 런타임 dependencies 가 없다", () => {
    expect(Object.keys(pkg.dependencies ?? {})).toEqual([]);
    expect(pkg.devDependencies.tslib).toBeDefined();
  });

  it("package-lock.json 이 package.json 의 이름·버전·의존성 구분과 일치한다", () => {
    const lock = JSON.parse(readFileSync("package-lock.json", "utf8"));
    const root = lock.packages[""];
    expect(lock.version).toBe(pkg.version);
    expect(root.version).toBe(pkg.version);
    expect(root.dependencies ?? {}).toEqual({});
    expect(root.devDependencies.tslib).toBe(pkg.devDependencies.tslib);
    expect(root.devDependencies.typescript).toBe(pkg.devDependencies.typescript);
  });
});
