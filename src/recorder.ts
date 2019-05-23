import * as screenshot from "screenshot-desktop";
import * as tmp from "tmp";
import * as path from "path";
import { exec } from "child_process";
import * as ffmpegPath from "ffmpeg-binaries";

const ffmpegAbsPath = path.resolve(__dirname, ffmpegPath);

let recording = false;
let paused = false;

let recordId = 0;

tmp.setGracefulCleanup();


const sleep = (duration: number) => new Promise((resolve, reject) => setTimeout(resolve, duration));

interface TempDir {
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


function imagesToVideo(tempDir: TempDir, directory: string, format: string) {
	const filename = "TEST";
	return new Promise((resolve, reject) => {
		//const command = `cd /d ${path.dirname(ffmpegAbsPath)} && ${path.basename(ffmpegAbsPath)} -r 60 -f image2 -s 1920x1080 -i ${path.join(tempDir.path, "s")}_%04d.${format} -vcodec libx264 -crf 25 -pix_fmt yuv420p ${path.join(directory, filename)}.mp4`;
		const command = `${ffmpegAbsPath} -r 60 -f image2 -s 1920x1080 -i ${path.join(tempDir.path, "s")}_%04d.${format} -vcodec libx264 -crf 25 -pix_fmt yuv420p ${path.join(directory, filename)}.mp4`;
		console.log("FFMPEG command:", command);
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


export function start(directory: string, displayId: string, format: string, interval: number) {

	if (recording) throw new Error("Already recording");

	recording = true;
	const id = recordId = Date.now();

	interval *= 1000;

	const record = async () => {
		const tempDir = await createTempDir();
		let nextShot = Date.now() + interval;
		let frame = 0;
		while (id === recordId) {
			await sleep(nextShot - Date.now());
			nextShot += interval;
			frame++;
			const filename = path.join(tempDir.path, "s_" + frame.toString().padStart(4, "0") + "." + format);
			console.log(frame, filename);
			await screenshot({filename, screen: displayId});
		}
		return tempDir;
	};

	return record().then((tempDir) => {
		return imagesToVideo(tempDir, directory, format);
	}).catch((err) => {
		console.error(err);
	});

}


export function stop() {
	if (!recording) return;
	recording = false;
	recordId = 0;
}


export function pause() {
	if (!recording) throw new Error("Not recording");
	if (paused) return;
}


export function resume() {
	if (!recording) throw new Error("Not recording");
	if (!paused) return;
}


export function isRecording() {
	return recording;
}


export function isPaused() {
	return paused;
}
