const path = require('path');

const reporters = ['default'];
try {
  // HTML 리포터는 부가 출력이므로 미설치 상태에서도 테스트는 실행합니다.
  reporters.push([
    require.resolve('jest-html-reporter'),
    {
      outputPath: path.resolve(__dirname, 'test-results', 'test-report.html'),
      pageTitle: 'Daracl Core Test Report',
      includeFailureMsg: true,
      includeConsoleLog: true,
      theme: 'darkTheme',
    },
  ]);
} catch (error) {
  if (error.code !== 'MODULE_NOT_FOUND') throw error;
  console.warn('[jest] jest-html-reporter가 없어 기본 리포터만 사용합니다.');
}

module.exports = {
  // 검증 산출물이나 외부 프로젝트 복사본을 테스트로 수집하지 않습니다.
  roots: ["<rootDir>/test"],
  verbose: true,
  testEnvironment: "jest-environment-jsdom",
  preset: "ts-jest",
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
    "^@t/(.*)$": "<rootDir>/src/types/$1",
  },
  moduleFileExtensions: ["js", "json", "jsx", "ts", "tsx", "json"],
  testMatch: ["**/?(*.)+(spec|test).ts"],
  transform: {
    "^.+\\.(ts|tsx|js|jsx)$": ["ts-jest", { tsconfig: "./tsconfig.test.json" }],
  },
  testPathIgnorePatterns: ["/node_modules/"],
  reporters,
};
