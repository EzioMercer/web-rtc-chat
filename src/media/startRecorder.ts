import { AAC_BITRATE, OPUS_BITRATE, RECORDER_SLICE_MS, VIDEO_NOTE_BITRATE } from './config.ts';
import { cropToSquare, type SquareVideo } from './cropToSquare.ts';
import { meterLevels } from './meterLevels.ts';
import { pickRecordingType } from './pickRecordingType.ts';
import { toWave } from './toWave.ts';

export type Recording = {
  blob: Blob;
  // In ms.
  duration: number;
  // Voice messages only (see MediaNote).
  wave?: number[];
};

export type Recorder = {
  video: boolean;
  // The camera, for the live preview of a video message.
  stream: MediaStream;
  startedAt: number;
  // How loud the microphone is right now, 0-1 (roughly).
  level: () => number;
  // Ends the recording and hands it over.
  stop: () => Promise<Recording>;
  // Ends it and throws it away.
  cancel: () => void;
};

// Louder than this counts as full on the live indicator.
const FULL_LEVEL = 0.25;

// Turns on the microphone (and the front camera for a video message) and starts recording. `onSize` gets the
// number of bytes recorded so far, about once a second.
export const startRecorder = async (video: boolean, onSize: (bytes: number) => void): Promise<Recorder> => {
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
    video: video ? { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 640 } } : false,
  });

  const stopTracks = () => stream.getTracks().forEach(track => track.stop());

  let square: SquareVideo | null = null;
  let recorder: MediaRecorder;
  let mimeType: string;

  try {
    square = video ? await cropToSquare(stream) : null;
    mimeType = pickRecordingType(video);

    const tracks = [...(square ? [square.track] : stream.getVideoTracks()), ...stream.getAudioTracks()];
    const opus = /opus|webm|ogg/.test(mimeType);

    recorder = new MediaRecorder(new MediaStream(tracks), {
      ...(mimeType ? { mimeType } : {}),
      audioBitsPerSecond: opus ? OPUS_BITRATE : AAC_BITRATE,
      ...(video ? { videoBitsPerSecond: VIDEO_NOTE_BITRATE } : {}),
    });
  } catch (err) {
    square?.stop();
    stopTracks();
    throw err;
  }

  const meter = meterLevels(stream);
  const chunks: Blob[] = [];
  let bytes = 0;
  let ended = false;

  const release = () => {
    ended = true;
    meter.stop();
    square?.stop();
    stopTracks();
  };

  const collect = () => {
    const type = (recorder.mimeType || mimeType || (video ? 'video/webm' : 'audio/webm')).split(';')[0];

    return new Blob(chunks, { type });
  };

  recorder.ondataavailable = (e) => {
    if (e.data.size) {
      chunks.push(e.data);
      bytes += e.data.size;
      onSize(bytes);
    }
  };

  recorder.start(RECORDER_SLICE_MS);

  const startedAt = Date.now();

  return {
    video,
    stream,
    startedAt,
    level: () => Math.min(1, meter.now() / FULL_LEVEL),
    stop: () => new Promise((resolve) => {
      const duration = Date.now() - startedAt;

      const done = () => {
        release();
        resolve({ blob: collect(), duration, ...(video ? {} : { wave: toWave(meter.levels) }) });
      };

      if (ended || recorder.state === 'inactive') {
        done();

        return;
      }

      // The last piece comes in a dataavailable event just before this.
      recorder.onstop = done;
      recorder.stop();
    }),
    cancel: () => {
      recorder.ondataavailable = null;
      recorder.onstop = null;

      if (recorder.state !== 'inactive') {
        recorder.stop();
      }

      release();
    },
  };
};
