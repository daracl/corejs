// module.exports = {
//   presets: [
//     [
//       "@babel/preset-env",
//       {
//         corejs: { version: 3 },
//         debug: true,
//         useBuiltIns: "usage",
//         targets: {
//           edge: "60",
//           firefox: "60",
//           chrome: "67",
//           safari: "11.1",
//         },
//       },
//     ],
//     "@babel/preset-typescript",
//   ],
//   plugins: [
//     "@babel/plugin-transform-arrow-functions",
//     "@babel/plugin-transform-block-scoping",
//     "@babel/plugin-transform-strict-mode",
//     /*
//     [
//       "@babel/plugin-transform-strict-mode",
//       {
//         strict: false,
//       },
//     ],
// */ [
//       "@babel/plugin-transform-runtime",
//       {
//         corejs: 3,
//         regenerator: true,
//       },
//     ],
//     "@babel/plugin-proposal-class-properties",
//     "@babel/plugin-syntax-dynamic-import",
//     "@babel/plugin-proposal-nullish-coalescing-operator",
//     "@babel/plugin-proposal-object-rest-spread",
//     "@babel/plugin-proposal-optional-chaining",
//     "@babel/plugin-proposal-export-default-from",
//   ],
//   // env: {
//   //   test: {
//   //     presets: ["env"],
//   //     // /plugins: ["transform-es2015-modules-commonjs", "dynamic-import-node"],
//   //   },
//   // },
// };

module.exports = {
  presets: [["@babel/preset-env"]],
};
