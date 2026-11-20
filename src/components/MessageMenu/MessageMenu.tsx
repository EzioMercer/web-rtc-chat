import { useEffect, useRef } from 'react';
import { cx } from '../../utils/cx.ts';
import styles from './MessageMenu.module.css';

type Props = {
  text: string;
  // Opens on the right for our messages, on the left for theirs.
  mine: boolean;
  onClose: () => void;
};

// Actions for one message, opened by tapping it.
export const MessageMenu = ({ text, mine, onClose }: Props) => {
  const ref = useRef<HTMLDivElement>(null);

  // Keep it in view when the message is at the bottom of the list.
  useEffect(() => {
    ref.current?.scrollIntoView({ block: 'nearest' });
  }, []);

  // Tapping anywhere else, or Escape, closes it. (Tapping the message itself closes it there.)
  useEffect(() => {
    const onDown = (e: PointerEvent) => {
      if (!ref.current?.parentElement?.contains(e.target as Node)) {
        onClose();
      }
    };

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('pointerdown', onDown);
    document.addEventListener('keydown', onKey);

    return () => {
      document.removeEventListener('pointerdown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  const copy = async () => {
    onClose();
    await navigator.clipboard.writeText(text).catch(() => undefined);
  };

  return (
    <div
      ref={ref}
      className={cx(styles.menu, mine ? styles.right : styles.left)}
      role="menu"
      onClick={e => e.stopPropagation()}
    >
      <button className={styles.item} type="button" role="menuitem" autoFocus onClick={() => void copy()}>
        Copy text
      </button>
    </div>
  );
};
