const {ipcRenderer} = require("electron");

const RecordState = {
	NOT_RECORDING: 1,
	RECORDING: 2,
	BUSY: 100
};

const recordBtn = document.getElementById("record-btn");
const interval = document.getElementById("interval");
const imgType = document.getElementById("imgtype");
const imgDir = document.getElementById("imgdir");

let selectedMonitor;
let recordingState = RecordState.NOT_RECORDING;

ipcRenderer.on("monitor-selected", (event, arg) => {
	selectedMonitor = arg;
	document.getElementById("monitor-selection").innerHTML = arg;
});

ipcRenderer.on("recording-change", (event, arg) => {
	if (arg) {
		recordingState = RecordState.RECORDING;
		recordBtn.value = "Stop Recording";
	} else {
		recordingState = RecordState.NOT_RECORDING;
		recordBtn.value = "Start Recording";
	}
});

document.getElementById("monitor").onclick = function() {
	ipcRenderer.send("select-monitor");
};

const canStartRecording = () => {
	return (interval.value && imgType.value && imgDir.value && selectedMonitor !== null);
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