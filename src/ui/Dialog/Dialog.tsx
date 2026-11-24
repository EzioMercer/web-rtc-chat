import { useEffect, useRef, type ReactNode, type SyntheticEvent } from 'react';
import { createPortal } from 'react-dom';
import { cx } from '../../utils/cx.ts';
import { Icon } from '../Icon/Icon.tsx';
import styles from './Dialog.module.css';

type Props = {
  title: string;
  children: ReactNode;
  // The X button or the backdrop (and Escape, without onBack).
  onClose: () => void;
  // For a window opened from another one: a back button before the title returns to it (so does Escape), while the
  // X closes both.
  onBack?: () => void;
  // False for a question that must be answered with its own buttons: no X, and a tap beside it does nothing (a stray
  // tap must not answer it). Escape still closes it, on purpose, on a computer.
  dismissible?: boolean;
};

// Open dialogs, oldest first. A question can open over another dialog; Escape answers only the top one.
const open: object[] = [];

// A modal over the whole app. Escape, the X or the backdrop closes it (only Escape when not `dismissible`).
// In full screen (a call) it opens inside the full-screen element, otherwise it would be hidden behind it.
export const Dialog = ({ title, children, onClose, onBack, dismissible = true }: Props) => {
  const me = useRef({});

  useEffect(() => {
    const token = me.current;

    open.push(token);

    return () => {
      open.splice(open.indexOf(token), 1);
    };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open.at(-1) === me.current) {
        (onBack ?? onClose)();
      }
    };

    // Capture: the backdrop stops key events from bubbling out of the dialog, so a bubbling listener would never
    // hear Escape pressed inside it.
    window.addEventListener('keydown', onKey, true);

    return () => window.removeEventListener('keydown', onKey, true);
  }, [onClose, onBack]);

  // React events bubble through portals to the component that opened the dialog; keep them here.
  const stop = (e: SyntheticEvent) => e.stopPropagation();

  return createPortal(
    <div
      className={styles.backdrop}
      onPointerDown={stop}
      onKeyDown={stop}
      onClick={(e) => {
        stop(e);

        if (dismissible) {
          onClose();
        }
      }}
    >
      <div
        className={styles.dialog}
        role={dismissible ? 'dialog' : 'alertdialog'}
        aria-modal="true"
        aria-label={title}
        onClick={stop}
      >
        <div className={cx(styles.header, onBack && styles.withBack)}>
          {onBack && (
            <button className={styles.headerButton} type="button" aria-label="Back" onClick={onBack}>
              <Icon name="back" />
            </button>
          )}
          <h2 className={styles.title}>{title}</h2>
          {dismissible && (
            <button className={styles.headerButton} type="button" aria-label="Close" onClick={onClose}>
              <Icon name="close" />
            </button>
          )}
        </div>
        <div className={styles.body}>{children}</div>
      </div>
    </div>,
    document.fullscreenElement ?? document.body,
  );
};
