let playing: HTMLMediaElement | null = null;

// Only one voice or video message plays at a time: starting one pauses the other.
export const playOne = (media: HTMLMediaElement) => {
  if (playing && playing !== media) {
    playing.pause();
  }

  playing = media;

  return media.play();
};
