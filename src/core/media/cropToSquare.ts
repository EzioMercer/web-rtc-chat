import { VIDEO_NOTE_FPS, VIDEO_NOTE_SIZE } from './config.ts';

export type SquareVideo = {
  track: MediaStreamTrack;
  stop: () => void;
};

// The middle square of the camera picture, small and mirrored like the preview, drawn onto a canvas: a round video
// message then needs far fewer bytes than the full camera picture. Null where the browser can't record a canvas.
export const cropToSquare = async (camera: MediaStream): Promise<SquareVideo | null> => {
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');

  if (!context || typeof canvas.captureStream !== 'function') {
    return null;
  }

  // Safari only draws videos that are on the page, so this one is there, invisible.
  const video = document.createElement('video');

  video.muted = true;
  video.playsInline = true;
  video.srcObject = camera;
  video.style.cssText = 'position:fixed;width:1px;height:1px;opacity:0;pointer-events:none';
  document.body.append(video);
  canvas.width = VIDEO_NOTE_SIZE;
  canvas.height = VIDEO_NOTE_SIZE;

  let frame = 0;

  const draw = () => {
    const { videoWidth: width, videoHeight: height } = video;
    const side = Math.min(width, height);
    const size = VIDEO_NOTE_SIZE;

    if (side) {
      context.setTransform(-1, 0, 0, 1, size, 0);
      context.drawImage(video, (width - side) / 2, (height - side) / 2, side, side, 0, 0, size, size);
    }

    frame = requestAnimationFrame(draw);
  };

  const stop = () => {
    cancelAnimationFrame(frame);
    video.srcObject = null;
    video.remove();
  };

  try {
    await video.play();
  } catch {
    stop();

    return null;
  }

  draw();

  const [track] = canvas.captureStream(VIDEO_NOTE_FPS).getVideoTracks();

  return {
    track,
    stop: () => {
      stop();
      track.stop();
    },
  };
};
