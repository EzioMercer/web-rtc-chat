import { useEffect, useRef, useState, type PointerEvent } from 'react';
import { playOne } from '../../media/playOne.ts';
import type { FileMessage } from '../../store/chat/types.ts';
import { cx } from '../../utils/cx.ts';
import { formatDuration } from '../../utils/formatDuration.ts';
import styles from './VoiceBubble.module.css';

type Props = {
  file: FileMessage;
};

// Bars shown when the sender's app sent no waveform.
const FLAT = Array.from({ length: 40 }, () => 4);

// A voice message: play button, waveform (tap it to jump), and the time.
export const VoiceBubble = ({ file }: Props) => {
  const { url, note, status, transferred, size, from, error } = file;
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  // Seconds played.
  const [position, setPosition] = useState(0);
  const duration = (note?.duration ?? 0) / 1000;
  const bars = note?.wave?.length ? note.wave : FLAT;
  const played = duration ? Math.min(1, position / duration) : 0;
  const percent = size ? Math.round((transferred / size) * 100) : 100;

  // Smooth progress while playing (the browser's own time event comes only a few times a second).
  useEffect(() => {
    const audio = audioRef.current;

    if (!playing || !audio) {
      return undefined;
    }

    let frame = 0;

    const tick = () => {
      setPosition(audio.currentTime);
      frame = requestAnimationFrame(tick);
    };

    tick();

    return () => cancelAnimationFrame(frame);
  }, [playing]);

  const toggle = () => {
    const audio = audioRef.current;

    if (!audio) {
      return;
    }

    if (audio.paused) {
      void playOne(audio).catch(() => undefined);
    } else {
      audio.pause();
    }
  };

  const seek = (e: PointerEvent<HTMLDivElement>) => {
    const audio = audioRef.current;

    if (!audio || !duration) {
      return;
    }

    const rect = e.currentTarget.getBoundingClientRect();
    const fraction = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));

    audio.currentTime = fraction * duration;
    setPosition(audio.currentTime);
  };

  const meta = () => {
    if (status === 'transferring') {
      return `${from === 'me' ? 'Sending' : 'Receiving'}… ${percent}%`;
    }

    if (status === 'failed') {
      return <span className={styles.failed}>{error ?? 'Failed'}</span>;
    }

    return formatDuration((playing || position > 0 ? position : duration) * 1000);
  };

  return (
    <div className={styles.voice}>
      {url && (
        <audio
          ref={audioRef}
          src={url}
          preload="metadata"
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onEnded={() => setPosition(0)}
        />
      )}
      <button
        className={styles.play}
        type="button"
        disabled={!url}
        aria-label={playing ? 'Pause' : 'Play voice message'}
        onClick={toggle}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d={playing ? 'M6 4h4v16H6zM14 4h4v16h-4z' : 'M7 4l14 8-14 8z'} />
        </svg>
      </button>
      <div className={styles.body}>
        <div className={styles.wave} aria-hidden="true" onPointerDown={seek}>
          {bars.map((level, i) => (
            <span
              // The bars never change order, so their place is their key.
              key={i}
              className={cx(styles.bar, (i + 0.5) / bars.length <= played && styles.played)}
              style={{ height: `${3 + level * 0.7}px` }}
            />
          ))}
        </div>
        <span className={styles.meta}>{meta()}</span>
      </div>
    </div>
  );
};
