import { ipcRenderer } from "electron";
import { createStore } from "redux";
import { reducer } from "./reducer";
const { dialog } = require("electron").remote;

// Static assets:
import "./sass/style.scss";
import "./monitor.html";

const store = createStore(reducer);

const RecordState = {
	NOT_RECORDING: 1,
	RECORDING: 2,
	PAUSED: 3,
	BUSY: 100
};

const recordBtn = document.getElementById("record-btn") as HTMLInputElement;
const pauseBtn = document.getElementById("pause-btn") as HTMLInputElement;
const interval = document.getElementById("interval") as HTMLInputElement;
const imgType = document.getElementById("imgtype") as HTMLInputElement;
const imgDir = document.getElementById("imgdir") as HTMLInputElement;
const monitor = document.getElementById("monitor") as HTMLInputElement;
const monitorSelection = document.getElementById("monitor-selection");

const bindValueToStore = (element, actionType, actionName) => {
	element.addEventListener("change", (event) => {
		const val = (element === imgDir ? element.files[0].path : element.value);
		store.dispatch({type: actionType, [actionName]: val});
	});
};

let recordingState = RecordState.NOT_RECORDING;

ipcRenderer.on("monitor-selected", (event, monitorId, singleMonitor) => {
	monitorSelection.innerHTML = monitorId;
	store.dispatch({type: "SET_MONITOR", monitor: monitorId});
	if (singleMonitor) {
		monitor.disabled = true;
	}
});

ipcRenderer.on("recording-change", (event, isRecording) => {
	if (isRecording) {
		recordingState = RecordState.RECORDING;
		recordBtn.value = "Stop Recording";
		pauseBtn.disabled = false;
	} else {
		recordingState = RecordState.NOT_RECORDING;
		recordBtn.value = "Start Recording";
		pauseBtn.value = "Pause";
		pauseBtn.disabled = true;
	}
});

ipcRenderer.on("pause-change", (event, isPaused) => {
	if (isPaused) {
		recordingState = RecordState.PAUSED;
		pauseBtn.value = "Resume";
	} else {
		recordingState = RecordState.RECORDING;
		pauseBtn.value = "Pause";
	}
});

const canStartRecording = () => {
	return (interval.value && imgType.value && imgDir.value && store.getState().selectedMonitor);
};

recordBtn.onclick = () => {
	switch(recordingState) {
		case RecordState.RECORDING:
		case RecordState.PAUSED:
			recordingState = RecordState.BUSY;
			ipcRenderer.send("record", false);
			break;
		case RecordState.NOT_RECORDING:
			if (canStartRecording()) {
				recordingState = RecordState.BUSY;
				ipcRenderer.send("record", true, store.getState());
			}
			break;
		default:
			break;
	}
};

pauseBtn.onclick = () => {
	switch(recordingState) {
		case RecordState.RECORDING:
			recordingState = RecordState.BUSY;
			ipcRenderer.send("pause", true);
			break;
		case RecordState.PAUSED:
			recordingState = RecordState.BUSY;
			ipcRenderer.send("pause", false);
			break;
		default:
			break;
	}
};

const afterStateLoaded = (initialState) => {
	interval.value = initialState.interval;
	imgType.value = initialState.imageType;
	monitorSelection.innerHTML = initialState.selectedMonitor || "";
	bindValueToStore(interval, "SET_INTERVAL", "interval");
	bindValueToStore(imgType, "SET_IMAGE_TYPE", "imageType");
	interval.addEventListener("change", (event) => {
		const num = parseFloat(interval.value);
		if ((!num) || num < 0.1 || num > 900) {
			interval.value = "1";
		}
	});
	monitor.addEventListener("click", () => {
		ipcRenderer.send("select-monitor");
	});
	imgDir.addEventListener("click", () => {
		dialog.showSaveDialog({
			filters: [{name: "Video", extensions: ["mp4"]}]
		}, (filename) => {
			if (!filename) return;
			document.getElementById("imgdirselection").innerHTML = filename;
			store.dispatch({type: "SET_IMAGE_DIRECTORY", imageDirectory: filename});
		});
	});
}

ipcRenderer.once("state-loaded", (event, state) => {
	store.dispatch({type: "SET_STATE", state: state});
	afterStateLoaded(store.getState());
});
ipcRenderer.send("load-state");

store.subscribe(() => {
	const disableFields = recordingState !== RecordState.NOT_RECORDING;
	recordBtn.disabled = !canStartRecording();
	interval.disabled = disableFields;
	imgType.disabled = disableFields;
	imgDir.disabled = disableFields;
	monitor.disabled = disableFields;
});

document.getElementById("devlapse-form").addEventListener("submit", (event) => {
	event.preventDefault();
	return false;
});