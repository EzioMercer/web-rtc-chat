import { useEffect, useRef, useState } from 'react';
import { Icon } from '../../../ui/Icon/Icon.tsx';
import type { IconName } from '../../../ui/Icon/paths.ts';
import { IconButton } from '../../../ui/IconButton/IconButton.tsx';
import styles from './AttachMenu.module.css';

type Item = {
  icon: IconName;
  label: string;
  disabled?: boolean;
  onPick: () => void;
};

type Props = {
  items: Item[];
  disabled?: boolean;
};

// The paper clip: a small menu of what can be sent besides text (files, a location, a live location).
export const AttachMenu = ({ items, disabled }: Props) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Tapping anywhere else, or Escape, closes it.
  useEffect(() => {
    if (!open) {
      return undefined;
    }

    const onDown = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    };

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
      }
    };

    document.addEventListener('pointerdown', onDown);
    document.addEventListener('keydown', onKey);

    return () => {
      document.removeEventListener('pointerdown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className={styles.wrap}>
      <IconButton icon="paperclip" label="Attach" disabled={disabled} onClick={() => setOpen(!open)} />
      {open && (
        <div className={styles.menu} role="menu">
          {items.map(item => (
            <button
              key={item.label}
              className={styles.item}
              type="button"
              role="menuitem"
              disabled={item.disabled}
              onClick={() => {
                setOpen(false);
                item.onPick();
              }}
            >
              <span className={styles.icon}><Icon name={item.icon} size={18} /></span>
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
