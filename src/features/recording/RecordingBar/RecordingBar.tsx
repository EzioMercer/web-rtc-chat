import { CANCEL_PX } from '../useRecording.ts';
import { useElapsed } from '../../../hooks/useElapsed.ts';
import type { Recorder } from '../../../core/media/startRecorder.ts';
import { cx } from '../../../utils/cx.ts';
import { formatDuration } from '../../../utils/formatDuration.ts';
import { Icon } from '../../../ui/Icon/Icon.tsx';
import { IconButton } from '../../../ui/IconButton/IconButton.tsx';
import styles from './RecordingBar.module.css';
import { RecordPhase } from '../RecordPhase.ts';

type Props = {
  phase: RecordPhase;
  recorder: Recorder | null;
  // How far the finger slid left (see useRecording).
  slideX: number;
  onCancel: () => void;
};

// Covers the message field while recording: the time so far, and how to cancel.
export const RecordingBar = ({ phase, recorder, slideX, onCancel }: Props) => {
  const elapsed = useElapsed(recorder?.startedAt ?? null);
  const locked = phase === RecordPhase.Locked;

  return (
    <div className={styles.bar}>
      {locked && <IconButton icon="trash" label="Delete recording" onClick={onCancel} />}
      <span className={cx(styles.dot, recorder && styles.live)} aria-hidden="true" />
      <span className={styles.time} aria-label="Recording time">{formatDuration(elapsed)}</span>
      {!locked && (
        <span
          className={styles.slide}
          style={{ transform: `translateX(${-slideX}px)`, opacity: 1 - slideX / CANCEL_PX }}
        >
          <Icon name="chevronLeft" size={16} />
          Slide to cancel
        </span>
      )}
    </div>
  );
};
