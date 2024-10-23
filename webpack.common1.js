const path = require("path");

const webpack = require("webpack");

const HtmlWebpackPlugin = require("html-webpack-plugin");

const { ModuleFederationPlugin } = require("webpack").container;

const nodeExternals = require("webpack-node-externals");

const packageJson = require("./package.json");
const topBanner = `/*!
* ${packageJson.name}  v${packageJson.version}
* Copyright 2023-${new Date().getUTCFullYear()} darainfo and other contributors; 
* Licensed ${packageJson.license}
*/`;

process.env.TOP_BANNER = topBanner;

const deps = require("./package.json").dependencies;

module.exports = {
  entry: {
    main: "./src/index.ts",
  },
  output: {
    path: path.join(__dirname, "dist"),
    filename: "[name].all.js",
    library: "Daracl", // export 모듈명
    libraryTarget: "umd",
  },

  resolve: {
    extensions: [".js", ".jsx", ".ts", ".tsx"],
    alias: {
      src: path.resolve(__dirname, "src/"),
      //moment: 'moment/src/moment'
      "@t": path.resolve(__dirname, "src/types"),
    },
  },

  // externals: {
  //   "@daracl/datetimepicker": {
  //     commonjs: "Daracl.dateTimePicker",
  //     commonjs2: "Daracl.dateTimePicker",
  //     amd: "Daracl.dateTimePicker",
  //     root: ["Daracl", "dateTimePicker"],
  //   },
  // },

  optimization: {
    providedExports: true,
    usedExports: true,

    // splitChunks: {
    //   chunks: "all", // 모든 청크에서 중복 모듈을 분리
    //   // cacheGroups: {
    //   //   vendors: {
    //   //     test: /[\\/]node_modules[\\/]/,
    //   //     name: "vendors",
    //   //     chunks: "all",
    //   //     reuseExistingChunk: true,
    //   //     idHint: "vendors",
    //   //   },
    //   // },

    //   /*
    //   minSize: 20000, // 최소 크기 (바이트)
    //   maxSize: 200000, // 최대 크기
    //   minChunks: 1, // 최소 몇 번 사용해야 분리할지
    //   maxAsyncRequests: 30, // 비동기 요청의 최대 수
    //   maxInitialRequests: 30, // 초기 요청의 최대 수
    //   automaticNameDelimiter: "~", // 이름 구분자
    //   */
    // },
  },
  module: {
    rules: [
      {
        test: /\.ts$|\.tsx$/u,
        exclude: /node_modules/u,
        include: path.resolve(__dirname, "src"),
        use: ["babel-loader", "ts-loader"],
      },
      {
        test: /\.js$|\.jsx$/u,
        exclude: /node_modules/u,
        include: path.resolve(__dirname, "src"),
        use: ["babel-loader"],
      },
      {
        test: /\.(svg|png|jpg|gif)$/,
        type: "asset/resource",
        use: [
          {
            loader: "file-loader",
          },
        ],
      },
      {
        test: /\.(woff(2)?|ttf|eot|svg)(\?v=\d+\.\d+\.\d+)?$/,
        type: "asset/resource",
        generator: {
          filename: "fonts/[name].[hash:8].[ext]",
        },
      },
    ],
  },
  plugins: [
    new webpack.ContextReplacementPlugin(/moment[/\\]locale$/, /ko|en|zh|ja/), // 다국어 적용
    new HtmlWebpackPlugin({
      inject: true,
      template: "sample/index.html",
    }),

    new webpack.BannerPlugin({
      banner: topBanner,
      raw: true,
    }),
    /*
    new webpack.IgnorePlugin({
      checkResource(resource, context) {
        // 리소스를 사용합니다
        console.log("resource : ", context === path.resolve(__dirname, "src/"), context, " || ", resource);

        const checkResource = ["@daracl/datetimepicker"];

        if (checkResource.includes(resource)) {
          if (context !== path.resolve(__dirname, "src/")) return true;
        }
        return false;
      },
    }),
    */
    // new ModuleFederationPlugin({
    //   filename: "daracl.vernder.js",
    //   shared: {
    //     "@daracl/datatimepicker": {
    //       import: false,
    //       shareScope: "default", // 기본 share scope
    //       singleton: true,
    //     },
    //   },
    // }),

    new webpack.DefinePlugin({
      APP_VERSION: JSON.stringify(packageJson.version), // 패키지 버전을 전역 변수로 설정합니다.
    }),
  ],
};
