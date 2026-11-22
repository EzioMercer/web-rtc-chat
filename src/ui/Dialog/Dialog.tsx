import { useEffect, type ReactNode, type SyntheticEvent } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from '../Icon/Icon.tsx';
import styles from './Dialog.module.css';

type Props = {
  title: string;
  children: ReactNode;
  // Escape, the X button or the backdrop.
  onClose: () => void;
  // False for a question that must be answered with its own buttons: no X, and a tap beside it does nothing (a stray
  // tap must not answer it). Escape still closes it, on purpose, on a computer.
  dismissible?: boolean;
};

// A modal over the whole app. Escape, the X or the backdrop closes it (only Escape when not `dismissible`).
// In full screen (a call) it opens inside the full-screen element, otherwise it would be hidden behind it.
export const Dialog = ({ title, children, onClose, dismissible = true }: Props) => {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', onKey);

    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

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
        <div className={styles.header}>
          <h2 className={styles.title}>{title}</h2>
          {dismissible && (
            <button className={styles.close} type="button" aria-label="Close" onClick={onClose}>
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
