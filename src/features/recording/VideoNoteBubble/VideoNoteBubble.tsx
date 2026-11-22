import { useEffect, useRef, useState } from 'react';
import { playOne } from '../../../core/media/playOne.ts';
import type { FileMessage } from '../../../store/chat/types.ts';
import { formatDuration } from '../../../utils/formatDuration.ts';
import { Icon } from '../../../ui/Icon/Icon.tsx';
import styles from './VideoNoteBubble.module.css';

type Props = {
  file: FileMessage;
};

// A round video message. Like chat apps, it plays silently on a loop while on screen; a tap plays it from the start
// with sound (another tap pauses), and a ring shows how far it got.
export const VideoNoteBubble = ({ file }: Props) => {
  const { url, note, status, transferred, size, from, error } = file;
  const videoRef = useRef<HTMLVideoElement>(null);
  // Playing with sound (instead of the silent loop).
  const [active, setActive] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const duration = (note?.duration ?? 0) / 1000;
  const percent = size ? Math.round((transferred / size) * 100) : 100;

  // The silent loop runs only while the message is on screen.
  useEffect(() => {
    const video = videoRef.current;

    if (!video || !url) {
      return undefined;
    }

    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) {
        video.pause();
      } else if (video.muted) {
        void video.play().catch(() => undefined);
      }
    });

    observer.observe(video);

    return () => observer.disconnect();
  }, [url]);

  useEffect(() => {
    const video = videoRef.current;

    if (!active || !playing || !video) {
      return undefined;
    }

    let frame = 0;

    const tick = () => {
      setPosition(video.currentTime);
      frame = requestAnimationFrame(tick);
    };

    tick();

    return () => cancelAnimationFrame(frame);
  }, [active, playing]);

  const tap = () => {
    const video = videoRef.current;

    if (!video) {
      return;
    }

    if (!active) {
      video.muted = false;
      video.loop = false;
      video.currentTime = 0;
      setActive(true);
      setPosition(0);
      void playOne(video).catch(() => undefined);
    } else if (video.paused) {
      void playOne(video).catch(() => undefined);
    } else {
      video.pause();
    }
  };

  // Back to the silent loop.
  const ended = () => {
    const video = videoRef.current;

    setActive(false);
    setPosition(0);

    if (video) {
      video.muted = true;
      video.loop = true;
      void video.play().catch(() => undefined);
    }
  };

  const meta = () => {
    if (status === 'transferring') {
      return `${from === 'me' ? 'Sending' : 'Receiving'}… ${percent}%`;
    }

    if (status === 'failed') {
      return <span className={styles.failed}>{error ?? 'Failed'}</span>;
    }

    return formatDuration((active ? position : duration) * 1000);
  };

  return (
    <div className={styles.note}>
      <button
        className={styles.circle}
        type="button"
        disabled={!url}
        aria-label={active && playing ? 'Pause video message' : 'Play video message'}
        onClick={tap}
      >
        {url
          ? (
              <video
                ref={videoRef}
                className={styles.video}
                src={url}
                muted
                loop
                playsInline
                preload="auto"
                onPlay={() => setPlaying(true)}
                onPause={() => setPlaying(false)}
                onEnded={ended}
              />
            )
          : (
              <span className={styles.waiting}>
                {percent}
                %
              </span>
            )}
        {active && duration > 0 && (
          <svg className={styles.ring} viewBox="0 0 100 100" aria-hidden="true">
            <circle
              className={styles.progress}
              cx="50"
              cy="50"
              r="48.5"
              pathLength={100}
              style={{ strokeDashoffset: 100 - Math.min(1, position / duration) * 100 }}
            />
          </svg>
        )}
        {url && !active && (
          <span className={styles.muted} aria-hidden="true">
            <Icon name="volumeOff" size={14} />
          </span>
        )}
      </button>
      <span className={styles.meta}>{meta()}</span>
    </div>
  );
};
