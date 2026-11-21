import { useEffect, useRef } from 'react';
import { VIDEO_NOTE_MAX_MS } from '../../media/config.ts';
import type { Recorder } from '../../media/startRecorder.ts';
import styles from './VideoNotePreview.module.css';

type Props = {
  recorder: Recorder;
};

// What the camera sees while recording a video message, in a circle, with a ring that fills up to the time limit.
export const VideoNotePreview = ({ recorder }: Props) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;

    if (!video) {
      return undefined;
    }

    video.srcObject = recorder.stream;
    void video.play().catch(() => undefined);

    return () => {
      video.srcObject = null;
    };
  }, [recorder]);

  return (
    <div className={styles.overlay}>
      <div className={styles.circle}>
        <video ref={videoRef} className={styles.video} muted playsInline />
        <svg className={styles.ring} viewBox="0 0 100 100" aria-hidden="true">
          <circle
            className={styles.progress}
            cx="50"
            cy="50"
            r="48"
            pathLength={100}
            style={{ animationDuration: `${VIDEO_NOTE_MAX_MS}ms` }}
          />
        </svg>
      </div>
    </div>
  );
};
