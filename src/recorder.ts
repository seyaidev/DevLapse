import { BrowserWindow } from "electron";
import * as screenshot from "screenshot-desktop";
import * as tmp from "tmp";
import * as path from "path";
import { exec } from "child_process";
import * as ffmpegPath from "ffmpeg-binaries";

const ffmpegAbsPath = path.resolve(__dirname, ffmpegPath);

interface DisplaySize {
	width: number;
	height: number;
	displayId: string;
}

let recording = false;
let paused = false;
let quit = false;

let recordId = 0;

tmp.setGracefulCleanup();


//const sleep = (duration: number) => new Promise((resolve, reject) => setTimeout(resolve, duration));

class Sleep {
	private timeout;
	private readonly duration: number;
	private started = false;
	private resolver: (value?: {} | PromiseLike<{}>) => void;
	constructor(duration: number) {
		this.duration = duration;
	}
	start = () => {
		if (this.started) return;
		this.started = true;
		const self = this;
		return new Promise((resolve, reject) => {
			self.resolver = resolve;
			self.timeout = setTimeout(resolve, this.duration);
		});
	}
	cancel = () => {
		if (!this.timeout) return;
		clearTimeout(this.timeout);
		this.resolver();
	}
}

let curSleep: Sleep = null;

export interface TempDir {
	path: string;
	cleanup: () => void;
}


function createTempDir(): Promise<TempDir> {
	return new Promise((resolve, reject) => {
		tmp.dir((err, path, cleanupCallback) => {
			if (err) {
				reject(err);
				return;
			}
			resolve({path: path, cleanup: cleanupCallback});
		});
	});
}

function getDisplaySize(displayId: string): Promise<DisplaySize> {
	return screenshot.listDisplays().then((displays => {
		const displaySize = {
			width: 0,
			height: 0,
			displayId
		};
		for (const display of displays) {
			if (display.id === displayId) {
				displaySize.width = display.width;
				displaySize.height = display.height;
			}
		}
		return displaySize;
	}));
}


function imagesToVideo(tempDir: TempDir, filepath: string, format: string, fps: number, displaySize: DisplaySize): Promise<void> {
	if (!filepath.endsWith(".mp4")) {
		filepath += ".mp4";
	}
	return new Promise((resolve, reject) => {
		const command = `${ffmpegAbsPath} -y -r ${fps} -f image2 -s ${displaySize.width}x${displaySize.height} -i ${path.join(tempDir.path, "f")}_%07d.${format} -vcodec libx264 -crf 25 -pix_fmt yuv420p ${filepath}`;
		console.log("FFMPEG:", command);
		exec(command, (err, stdout, stderr) => {
			if (err) {
				console.error(err);
				reject(err);
				return;
			}
			console.log("Images written to video");
			tempDir.cleanup();
			resolve();
		});
	});
}


export async function start(parent: BrowserWindow, filepath: string, displayId: string, format: string, interval: number, fps: number): Promise<void> {

	if (recording) throw new Error("Already recording");

	recording = true;
	const id = recordId = Date.now();

	interval *= 1000;

	const record = async () => {
		const tempDir = await createTempDir();
		let frame = 0;
		while (id === recordId) {
			curSleep = new Sleep(interval);
			await curSleep.start();
			if (id !== recordId) break;
			if (!paused) {
				frame++;
				const filename = path.join(tempDir.path, "f_" + frame.toString().padStart(7, "0") + "." + format);
				console.log(frame, filename);
				await screenshot({filename, screen: displayId});
			}
		}
		console.log("Recording done");
		return tempDir;
	};

	const displaySize = await getDisplaySize(displayId);

	return record().then((tempDir) => {
		if (quit) return;
		return imagesToVideo(tempDir, filepath, format, fps, displaySize);
	}).catch((err) => {
		console.error(err);
	});

}


export function stop() {
	if (!recording) return;
	if (curSleep) {
		curSleep.cancel();
		curSleep = null;
	}
	recording = false;
	paused = false;
	recordId = 0;
}


export function stopQuit() {
	quit = true;
	stop();
}


export function pause() {
	if ((!recording) || paused) return;
	paused = true;
	console.log("Paused");
}


export function resume() {
	if ((!recording) || (!paused)) return;
	paused = false;
	console.log("Resumed");
}


export function isRecording() {
	return recording;
}


export function isPaused() {
	return paused;
}
