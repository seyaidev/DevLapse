const {app, BrowserWindow, ipcMain} = require("electron");

let mainWindow;

function createWindow() {
	mainWindow = new BrowserWindow({
		width: 800,
		height: 600,
		webPreferences: {
			nodeIntegration: true
		}
	});
	mainWindow.loadFile("index.html");
	mainWindow.webContents.openDevTools();
	mainWindow.on("closed", () => {
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

ipcMain.on("select-monitor", (event, arg) => {
	event.reply("monitor-selected", 1);
});

ipcMain.on("record", (event, startRecord) => {
	if (startRecord) {
		event.reply("recording-change", true);
	} else {
		event.reply("recording-change", false);
	}
});