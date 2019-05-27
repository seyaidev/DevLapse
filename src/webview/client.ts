import { ipcRenderer } from "electron";
import { createStore } from "redux";
import { reducer } from "./reducer";
const { dialog } = require("electron").remote;
import "../../semantic/dist/semantic.min.js";


// Static assets:
import "./sass/style.scss";
import "./monitor.html";

declare const _VERSION: string;
declare const $;

const store = createStore(reducer);

const RecordState = {
	NOT_RECORDING: 1,
	RECORDING: 2,
	PAUSED: 3,
	BUSY: 100
};

const MIN_INTERVAL = 0.1;
const MAX_INTERVAL = 900;

const MIN_FPS = 1;
const MAX_FPS = 120;

const recordBtn = document.getElementById("record-btn") as HTMLInputElement;
const pauseBtn = document.getElementById("pause-btn") as HTMLInputElement;
const interval = document.getElementById("interval") as HTMLInputElement;
const fps = document.getElementById("fps") as HTMLInputElement;
const imgType = document.getElementById("imgtype") as HTMLInputElement;
const imgDir = document.getElementById("imgdir") as HTMLInputElement;
const monitor = document.getElementById("monitor") as HTMLInputElement;
const monitorSelection = document.getElementById("monitor-selection");

$(".version").text(`v${_VERSION}`);

$(imgType).dropdown({
	clearable: false
});

const bindValueToStore = (element, actionType, actionName) => {
	element.addEventListener("change", (event) => {
		const val = (element === imgDir ? element.files[0].path : element.value);
		store.dispatch({type: actionType, [actionName]: val});
	});
};

let recordingState = RecordState.NOT_RECORDING;
const setRecordingState = (state: number) => {
	if (state === recordingState) return;
	recordingState = state;
	store.dispatch({type: "SET_RECORD_STATE", recordState: state});
	let title = "DevLapse";
	switch (recordingState) {
		case RecordState.RECORDING:
			title += " (Recording)"
			break;
		case RecordState.PAUSED:
			title += " (Paused)"
			break;
	}
	document.title = title;
};

ipcRenderer.on("monitor-selected", (event, monitorId, singleMonitor) => {
	monitorSelection.innerHTML = monitorId;
	store.dispatch({type: "SET_MONITOR", monitor: monitorId});
	if (singleMonitor) {
		monitor.disabled = true;
	}
});

ipcRenderer.on("video-complete", (event) => {
	$("#create-video-msg").removeClass("ui active dimmer").addClass("ui dimmer");
	document.getElementById("imgdirselection").innerHTML = "[No selection]";
	store.dispatch({type: "SET_IMAGE_DIRECTORY", imageDirectory: ""});
});

ipcRenderer.on("recording-change", (event, isRecording) => {
	if (isRecording) {
		setRecordingState(RecordState.RECORDING);
		recordBtn.value = "Stop Recording";
		pauseBtn.disabled = false;
	} else {
		setRecordingState(RecordState.NOT_RECORDING);
		recordBtn.value = "Start Recording";
		pauseBtn.value = "Pause";
		pauseBtn.disabled = true;
	}
});

ipcRenderer.on("pause-change", (event, isPaused) => {
	if (isPaused) {
		setRecordingState(RecordState.PAUSED);
		pauseBtn.value = "Resume";
	} else {
		setRecordingState(RecordState.RECORDING);
		pauseBtn.value = "Pause";
	}
});

const canStartRecording = () => {
	const state = store.getState();
	return (interval.value && imgType.value && state.imageDirectory && state.selectedMonitor);
};

recordBtn.onclick = () => {
	switch(recordingState) {
		case RecordState.RECORDING:
		case RecordState.PAUSED:
			$("#create-video-msg").removeClass("ui dimmer").addClass("ui active dimmer");
			setRecordingState(RecordState.BUSY);
			ipcRenderer.send("record", false);
			break;
		case RecordState.NOT_RECORDING:
			if (canStartRecording()) {
				setRecordingState(RecordState.BUSY);
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
			setRecordingState(RecordState.BUSY);
			ipcRenderer.send("pause", true);
			break;
		case RecordState.PAUSED:
			setRecordingState(RecordState.BUSY);
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
	fps.value = initialState.fps;
	bindValueToStore(imgType, "SET_IMAGE_TYPE", "imageType");
	interval.addEventListener("change", (event) => {
		const num = parseFloat(interval.value);
		let n = num;
		if ((!num) || num < MIN_INTERVAL || num > MAX_INTERVAL) {
			n = (typeof num === "number" ? n : 1);
			n = (n < MIN_INTERVAL ? MIN_INTERVAL : n > MAX_INTERVAL ? MAX_INTERVAL : n)
		}
		if (n !== num) {
			interval.value = n.toString();
		}
		store.dispatch({type: "SET_INTERVAL", interval: n});
	});
	fps.addEventListener("change", (event) => {
		const num = parseInt(fps.value);
		let n = num;
		if ((!num) || num < MIN_FPS || num > MAX_FPS) {
			n = Math.floor(typeof num === "number" ? n : 1);
			n = (n < MIN_FPS ? MIN_FPS : n > MAX_FPS ? MAX_FPS : n);
		}
		if (n !== num) {
			fps.value = n.toString();
		}
		store.dispatch({type: "SET_FPS", fps: n});
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
	const disableFields = (recordingState !== RecordState.NOT_RECORDING);
	const isRecording = (recordingState === RecordState.RECORDING);
	const isPaused = (recordingState === RecordState.PAUSED);
	recordBtn.disabled = !canStartRecording();
	interval.disabled = disableFields;
	imgType.disabled = disableFields;
	imgDir.disabled = disableFields;
	monitor.disabled = disableFields;
	$("#record-icon").removeClass("circle stop icon").addClass(`${isRecording || isPaused ? "stop" : "circle"} icon`);
	$("#pause-icon").removeClass("pause play icon").addClass(`${isPaused ? "play" : "pause"} icon`);
});

document.getElementById("devlapse-form").addEventListener("submit", (event) => {
	event.preventDefault();
	return false;
});