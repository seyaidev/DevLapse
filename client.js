const {ipcRenderer} = require("electron");
const {createStore} = require("redux");
const {reducer} = require("./reducer");

const store = createStore(reducer);
store.dispatch({type: "LOAD"});

const RecordState = {
	NOT_RECORDING: 1,
	RECORDING: 2,
	BUSY: 100
};

const recordBtn = document.getElementById("record-btn");
const interval = document.getElementById("interval");
const imgType = document.getElementById("imgtype");
const imgDir = document.getElementById("imgdir");
const monitor = document.getElementById("monitor");
const monitorSelection = document.getElementById("monitor-selection");

const bindValueToStore = (element, actionType, actionName) => {
	element.onchange = () => {
		store.dispatch({type: actionType, [actionName]: element.value});
	};
};

let recordingState = RecordState.NOT_RECORDING;

ipcRenderer.on("monitor-selected", (event, monitorId) => {
	monitorSelection.innerHTML = monitorId;
	store.dispatch({type: "SET_MONITOR", monitor: monitorId});
});

ipcRenderer.on("recording-change", (event, isRecording) => {
	if (isRecording) {
		recordingState = RecordState.RECORDING;
		recordBtn.value = "Stop Recording";
	} else {
		recordingState = RecordState.NOT_RECORDING;
		recordBtn.value = "Start Recording";
	}
});

const canStartRecording = () => {
	return (interval.value && imgType.value && imgDir.value && monitor.value !== null);
};

recordBtn.onclick = function() {
	switch(recordingState) {
		case RecordState.RECORDING:
			recordingState = RecordState.BUSY;
			ipcRenderer.send("record", false);
			break;
		case RecordState.NOT_RECORDING:
			if (canStartRecording()) {
				recordingState = RecordState.BUSY;
				ipcRenderer.send("record", true);
			}
			break;
		default:
			break;
	}
};

const afterStateLoaded = (initialState) => {
	interval.value = initialState.interval;
	imgType.value = initialState.imageType;
	bindValueToStore(interval, "SET_INTERVAL", "interval");
	monitor.onclick = function() {
		ipcRenderer.send("select-monitor");
	};
}

ipcRenderer.once("state-loaded", (event, state) => {
	store.dispatch({type: "SET_STATE", state: state});
	afterStateLoaded(store.getState());
});
ipcRenderer.send("load-state");