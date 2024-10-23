module.exports = {
  moduleFileExtensions: ["js", "json", "jsx", "ts", "tsx", "json"],
  transform: {
    '^.+\\.ts?$': 'ts-jest'
    ,'^.+\\.(js|([tj]sx))?$': 'babel-jest'
     
  },
  testEnvironment: 'node',
  transformIgnorePatterns: [
    "<rootDir>/node_modules/(?!lodash-es)"
  ]
};
