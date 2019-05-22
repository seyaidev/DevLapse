const {app, BrowserWindow, ipcMain} = require("electron");
const screenshot = require("screenshot-desktop");
const storage = require("electron-json-storage");

let mainWindow;
let monitorSelectWindows = [];

function createWindow() {
	mainWindow = new BrowserWindow({
		width: 400,
		height: 600,
		resizable: false,
		maximizable: false,
		webPreferences: {
			nodeIntegration: true
		}
	});
	mainWindow.setMenu(null);
	mainWindow.loadFile("index.html");
	//mainWindow.webContents.openDevTools();
	mainWindow.on("closed", () => {
		for (const monitorWindow of monitorSelectWindows) {
			monitorWindow.window.close();
		}
		monitorSelectWindows = [];
		mainWindow = null;
	});
}

app.on("ready", createWindow);
app.on("window-all-closed", () => {
	if (process.platform !== "darwin") {
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
				backgroundColor: "#F2000000",
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
			window.loadFile("monitor.html");
			//window.webContents.openDevTools();
			window.webContents.on("did-finish-load", () => {
				window.webContents.send("display-info", display);
			});
		}
	});
});

ipcMain.on("record", (event, startRecord) => {
	if (startRecord) {
		event.reply("recording-change", true);
	} else {
		event.reply("recording-change", false);
	}
});

ipcMain.on("save-state", (event, state) => {
	storage.set("devlapse", state);
});

ipcMain.on("load-state", (event) => {
	storage.get("devlapse", (err, data) => {
		if (err) throw err;
		event.reply("state-loaded", data);
	});
});

ipcMain.on("monitor-mouse-over", (event, id) => {
	for (const monitorWindow of monitorSelectWindows) {
		if (monitorWindow.display.id !== id) {
			monitorWindow.window.webContents.send("lost-focus");
		}
	}
});