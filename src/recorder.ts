import { BrowserWindow } from "electron";
import * as screenshot from "screenshot-desktop";
import * as tmp from "tmp";
import * as path from "path";
import { exec } from "child_process";
import * as ffmpegPath from "ffmpeg-binaries";

const ffmpegAbsPath = path.resolve(__dirname, ffmpegPath);

let recording = false;
let paused = false;
let quit = false;

let recordId = 0;

tmp.setGracefulCleanup();


const sleep = (duration: number) => new Promise((resolve, reject) => setTimeout(resolve, duration));

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


function imagesToVideo(tempDir: TempDir, filepath: string, format: string) {
	if (!filepath.endsWith(".mp4")) {
		filepath += ".mp4";
	}
	return new Promise((resolve, reject) => {
		const command = `${ffmpegAbsPath} -y -r 60 -f image2 -s 1920x1080 -i ${path.join(tempDir.path, "f")}_%07d.${format} -vcodec libx264 -crf 25 -pix_fmt yuv420p ${filepath}`;
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


export function start(parent: BrowserWindow, filepath: string, displayId: string, format: string, interval: number) {

	if (recording) throw new Error("Already recording");

	recording = true;
	const id = recordId = Date.now();

	interval *= 1000;

	const record = async () => {
		const tempDir = await createTempDir();
		let frame = 0;
		while (id === recordId) {
			await sleep(interval);
			if (!paused) {
				frame++;
				const filename = path.join(tempDir.path, "f_" + frame.toString().padStart(7, "0") + "." + format);
				console.log(frame, filename);
				await screenshot({filename, screen: displayId});
			}
		}
		return tempDir;
	};

	return record().then((tempDir) => {
		if (quit) return;
		return imagesToVideo(tempDir, filepath, format);
	}).catch((err) => {
		console.error(err);
	});

}


export function stop() {
	if (!recording) return;
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
