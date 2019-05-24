/* eslint-disable @typescript-eslint/no-var-requires */
const fs = require("fs");
const { exec } = require("child_process");

fs.readFile("./package.json", {encoding: "utf8"}, function(err, data) {
	if (err) throw err;
	data = JSON.parse(data);
	const dependencies = data.dependencies;
	const installs = ["npm", "i", "--prefix", "./dist"];
	for (const dependency in dependencies) {
		installs.push(`${dependency}@${dependencies[dependency]}`);
	}
	const command = installs.join(" ");
	console.log("Installing dependencies: ", command);
	exec(command, (err) => {
		if (err) {
			console.error(`Error: ${err}`);
			return;
		}
		console.log("Installation complete");
	});
});