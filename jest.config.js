const path = require('path');

module.exports = {
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
    "^.+\\.js$": "babel-jest",
    //"^.+\\.(ts|tsx|js|jsx)$": ["ts-jest", { isolatedModules: true, useESM: true }],
    "^.+\\.(ts|tsx|js|jsx)$": ["ts-jest", { tsconfig: "./tsconfig.test.json" }],
  },
  testPathIgnorePatterns: ["/node_modules/"],
  transformIgnorePatterns: ["/node_modules/(?!(@daracl/loading))/"],
  // globals: {
  //   "ts-jest": {
  //     tsconfig: "tsconfig.json",
  //   },
  // },
  reporters: [
    'default',
    [
      'jest-html-reporter',
      {
        // 프로젝트 루트 기준 절대 경로로 리포트 파일 저장
        outputPath: path.resolve(__dirname, 'test-results', 'test-report.html'),
        pageTitle: 'Daracl Core Test Report',
        includeFailureMsg: true,
        includeConsoleLog: true,
        theme: 'darkTheme',
        openReport: false, // 테스트 후 자동으로 브라우저에서 열기 (필요시 true로 변경)
      },
    ],
  ],
};
