import { useEffect, type ReactNode, type SyntheticEvent } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from '../Icon/Icon.tsx';
import styles from './Dialog.module.css';

type Props = {
  title: string;
  children: ReactNode;
  onClose: () => void;
};

// A modal over the whole app. Escape or the backdrop closes it.
export const Dialog = ({ title, children, onClose }: Props) => {
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
        onClose();
      }}
    >
      <div className={styles.dialog} role="dialog" aria-modal="true" aria-label={title} onClick={stop}>
        <div className={styles.header}>
          <h2 className={styles.title}>{title}</h2>
          <button className={styles.close} type="button" aria-label="Close" onClick={onClose}>
            <Icon name="close" />
          </button>
        </div>
        <div className={styles.body}>{children}</div>
      </div>
    </div>,
    document.body,
  );
};
