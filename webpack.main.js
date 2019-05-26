/* eslint-disable @typescript-eslint/no-var-requires */
const webpack = require("webpack");
const path = require("path");
const version = JSON.parse(require("fs").readFileSync("./package.json", {encoding: "utf8"})).version;

module.exports = (env, argv) => {
	const isProd = (argv.mode === "production");
	const public = path.resolve(__dirname, "./build");
	const config = {
		target: "electron-main",
		externals: {
			"screenshot-desktop": "require(\"screenshot-desktop\")",
			"ffmpeg-binaries": "require(\"ffmpeg-binaries\")"
		},
		node: {
			__dirname: false
		},
		entry: {
			main: path.join(__dirname, "src", "main.ts")
		},
		output: {
			path: public,
			filename: "[name].js"
		},
		resolve: {
			extensions: [".tsx", ".ts", ".js"]
		},
		module: {
			rules: [
				{
					test: /\.ts$/,
					include: path.resolve(__dirname, "src"),
					use: "ts-loader"
				}
			]
		},
		plugins: [
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