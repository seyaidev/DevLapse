import { app, BrowserWindow, ipcMain } from "electron";
import * as screenshot from "screenshot-desktop";
import * as storage from "electron-json-storage";
import * as recorder from "./recorder";
import * as path from "path";
import { exec } from "child_process";

const DEBUG = false;

let mainWindow;
let monitorSelectWindows = [];

let recordPromise: Promise<void>;

let singleDisplay = null;
const singleMonitorPromise = screenshot.listDisplays().then((displays) => {
	if (displays.length === 1) {
		singleDisplay = displays[0];
	}
}).catch((err) => {
	console.error(err);
	process.exit();
});

function createWindow() {
	mainWindow = new BrowserWindow({
		width: DEBUG ? 700 : 400,
		height: 650,
		resizable: false,
		maximizable: false,
		webPreferences: {
			nodeIntegration: true
		}
	});
	mainWindow.setTitle("DevLapse");
	mainWindow.setMenu(null);
	mainWindow.loadFile("./build/webview/index.html");
	if (DEBUG) mainWindow.webContents.openDevTools();
	mainWindow.on("closed", () => {
		for (const monitorWindow of monitorSelectWindows) {
			monitorWindow.window.close();
		}
		monitorSelectWindows = [];
		mainWindow = null;
	});
	mainWindow.webContents.on("did-finish-load", async () => {
		await singleMonitorPromise;
		if (singleDisplay) {
			mainWindow.webContents.send("monitor-selected", singleDisplay.id, true);
		}
	});
}

app.on("ready", () => {
	createWindow();
});

app.on("window-all-closed", () => {
	if (process.platform !== "darwin") {
		recorder.stopQuit();
		app.quit();
	}
});

app.on("activate", () => {
	if (mainWindow === null) {
		createWindow();
	}
});

ipcMain.on("monitor-clicked", (event, displayId) => {
	for (const monitorWindow of monitorSelectWindows) {
		monitorWindow.window.close();
	}
	monitorSelectWindows = [];
	mainWindow.webContents.send("monitor-selected", displayId);
});

ipcMain.on("select-monitor", (event, arg) => {
	//event.reply("monitor-selected", 1);
	if (singleDisplay) return;
	screenshot.listDisplays().then((displays) => {
		for (const display of displays) {
			const window = new BrowserWindow({
				width: display.right - display.left,
				height: display.bottom - display.top,
				x: display.left,
				y: display.top,
				resizable: false,
				movable: false,
				minimizable: false,
				maximizable: false,
				fullscreenable: false,
				frame: false,
				transparent: true,
				hasShadow: false,
				titleBarStyle: "hidden",
				modal: true,
				parent: mainWindow,
				acceptFirstMouse: true,
				alwaysOnTop: true,
				webPreferences: {
					nodeIntegration: true
				}
			});
			monitorSelectWindows.push({window, display});
			window.loadFile("./build/webview/monitor.html");
			//window.webContents.openDevTools();
			window.webContents.on("did-finish-load", () => {
				window.webContents.send("display-info", display);
			});
		}
	});
});

ipcMain.on("record", (event, startRecord, state) => {
	if (startRecord) {
		event.reply("recording-change", true);
		recordPromise = recorder.start(mainWindow, state.imageDirectory, state.selectedMonitor, state.imageType, state.interval, state.fps);
		recordPromise.then(() => {
			mainWindow.webContents.send("video-complete");
			const dirPath = path.dirname(state.imageDirectory);
			exec(`start "" "${dirPath}"`);
		});
	} else {
		event.reply("recording-change", false);
		recorder.stop();
	}
});

ipcMain.on("pause", (event, pause) => {
	if (pause) {
		recorder.pause();
		event.reply("pause-change", true);
	} else {
		recorder.resume();
		event.reply("pause-change", false);
	}
});

ipcMain.on("save-state", (event, state) => {
	storage.set("devlapse", state);
});

ipcMain.on("load-state", (event) => {
	storage.get("devlapse", (err, data) => {
		if (err) throw err;
		data.imageDirectory = "";
		const monitorIdExists = (id: string): Promise<boolean> => {
			return new Promise((resolve, reject) => {
				screenshot.listDisplays().then((displays) => {
					for (const display of displays) {
						if (display.id === id) {
							resolve(true);
							return;
						}
					}
					resolve(false);
				}).catch(reject);
			});
		};
		monitorIdExists(data.selectedMonitor).then((monitorExists) => {
			if (!monitorExists) {
				data.selectedMonitor = null;
			}
			event.reply("state-loaded", data);
		});
	});
});

ipcMain.on("monitor-mouse-over", (event, id) => {
	for (const monitorWindow of monitorSelectWindows) {
		if (monitorWindow.display.id !== id) {
			monitorWindow.window.webContents.send("lost-focus");
		}
	}
});