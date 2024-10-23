const path = require("path");

const webpack = require("webpack");

const CopyWebpackPlugin = require("copy-webpack-plugin");

const HtmlWebpackPlugin = require("html-webpack-plugin");

const merge = require("webpack-merge").merge;
const common = require("./webpack.common.js");

const PATHS = {
  src: path.join(__dirname, "../src"),
  dist: path.join(__dirname, "../dist"),
};

module.exports = merge(common, {
  mode: "development",
  cache: false,
  devtool: "inline-source-map",
  devServer: {
    // inline: true,
    //mode: 'development',
    host: "0.0.0.0",
    port: 9000,
    open: {
      app: {
        name: "chrome",
        arguments: ["--new-window", "--auto-open-devtools-for-tabs"],
      },
    },
  },
  module: {
    rules: [
      {
        test: /\.(sa|sc|c)ss$/i,
        //exclude: /node_modules/u,
        use: ["style-loader", "css-loader", "sass-loader"],
      },
    ],
  },
  plugins: [
    //new BundleAnalyzerPlugin()
    // new CopyWebpackPlugin({
    //   patterns: [{ from: "custom", to: "custom" }],
    // }),
  ],
});
