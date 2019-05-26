/* eslint-disable @typescript-eslint/no-var-requires */
const webpack = require("webpack");
const path = require("path");
const HtmlWebPackPlugin = require("html-webpack-plugin");
const MiniCssExtractPlugin = require("mini-css-extract-plugin");

const miniCssExtractPlugin = new MiniCssExtractPlugin({
	filename: "css/[name].css",
	chunkFilename: "css/[id].css"
});

const version = JSON.parse(require("fs").readFileSync("./package.json", {encoding: "utf8"})).version;

module.exports = (env, argv) => {
	const isProd = (argv.mode === "production");
	const public = path.resolve(__dirname, "./build/webview");
	const htmlPlugin = new HtmlWebPackPlugin({
		template: "./src/webview/index.html",
		filename: path.resolve(public, "index.html")
	});
	const config = {
		target: "electron-renderer",
		entry: {
			jquery: "./src/webview/jquery.js",
			bundle: "./src/webview/client.ts"
		},
		output: {
			path: public,
			filename: "js/[name].js"
		},
		resolve: {
			extensions: [".tsx", ".ts", ".js"]
		},
		module: {
			rules: [
				{
					test: /\.tsx?$/,
					include: path.resolve(__dirname, "src", "webview"),
					use: "ts-loader"
				},
				{
					test: /\.css$/,
					use: ["style-loader", "css-loader"]
				},
				{
					test: /\.scss$/,
					use: [
						{
							loader: MiniCssExtractPlugin.loader
						},
						{
							loader: "css-loader",
							options: {
								sourceMap: !isProd
							}
						},
						{
							loader: "sass-loader",
							options: {
								sourceMap: !isProd,
								outFile: `./build/css/main.css`,
								minimize: true
							}
						}
					]
				},
				{
					test: /\.html$/,
					exclude: path.join(__dirname, "src", "webview", "index.html"),
					use: {
						loader: "file-loader",
						options: {
							name: "[name].[ext]"
						}
					}
				},
				{
					test: /\.(png|svg|jpg|gif)$/,
					use: {
						loader: "file-loader",
						options: {
							name: "./imgs/[name].[ext]"
						}
					}
				},
				{
					test: /\.(ttf|eot|woff|woff2)$/,
					use: {
						loader: "file-loader",
						options: {
							name: "./fonts/[name].[ext]",
							publicPath: "../"
						}
					}
				}
			]
		},
		plugins: [
			htmlPlugin,
			miniCssExtractPlugin,
			new webpack.DefinePlugin({
				_VERSION: JSON.stringify(version)
			})
		]
	};
	if (!isProd) {
		config.devtool = "inline-source-map";
	}
	return config;
};