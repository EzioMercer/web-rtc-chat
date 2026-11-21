import { useEffect, useRef, type MouseEvent, type PointerEvent } from 'react';
import type { RecordPhase } from '../../hooks/useRecording.ts';
import type { Recorder } from '../../media/startRecorder.ts';
import type { MediaNote } from '../../store/chat/types.ts';
import { cx } from '../../utils/cx.ts';
import { Icon } from '../Icon/Icon.tsx';
import styles from './RecordButton.module.css';

type Handlers = {
  onPointerDown: (e: PointerEvent<HTMLButtonElement>) => void;
  onPointerMove: (e: PointerEvent<HTMLButtonElement>) => void;
  onPointerUp: () => void;
  onPointerCancel: () => void;
  onClick: (e: MouseEvent<HTMLButtonElement>) => void;
  onContextMenu: (e: MouseEvent) => void;
};

type Props = {
  mode: MediaNote['type'];
  phase: RecordPhase;
  recorder: Recorder | null;
  slide: { x: number; y: number };
  hint: string | null;
  disabled: boolean;
  handlers: Handlers;
};

// The microphone/camera button next to the message field (see useRecording). While held it grows under the finger
// and follows it; locked, it becomes the Send button.
export const RecordButton = ({ mode, phase, recorder, slide, hint, disabled, handlers }: Props) => {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const held = phase === 'starting' || phase === 'recording';
  const locked = phase === 'locked';

  // A glow around the button that follows how loud the microphone is.
  useEffect(() => {
    const button = buttonRef.current;

    if (!recorder || !button) {
      return undefined;
    }

    let frame = 0;

    const tick = () => {
      button.style.setProperty('--level', recorder.level().toFixed(2));
      frame = requestAnimationFrame(tick);
    };

    tick();

    return () => {
      cancelAnimationFrame(frame);
      button.style.removeProperty('--level');
    };
  }, [recorder]);

  const label = locked
    ? 'Send'
    : `${mode === 'video' ? 'Video' : 'Voice'} message: hold to record, tap to switch to ${
      mode === 'video' ? 'voice' : 'video'}`;

  return (
    <span className={styles.wrap}>
      {phase === 'recording' && (
        <span className={styles.lock} style={{ transform: `translateY(${-slide.y}px)` }} aria-hidden="true">
          <Icon name="lock" size={16} />
          <Icon name="chevronUp" size={16} />
        </span>
      )}
      {hint && <span className={styles.hint} role="status">{hint}</span>}
      <button
        ref={buttonRef}
        className={cx(styles.button, held && styles.held, locked && styles.locked)}
        type="button"
        title={label}
        aria-label={label}
        disabled={disabled}
        style={held ? { transform: `translate(${-slide.x}px, ${-slide.y}px) scale(1.5)` } : undefined}
        {...handlers}
      >
        <Icon name={locked ? 'send' : (mode === 'video' ? 'video' : 'mic')} />
      </button>
    </span>
  );
};
