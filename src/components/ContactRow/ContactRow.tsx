import { useState, type PointerEvent, type MouseEvent } from 'react';
import type { Contact } from '../../store/contacts/types.ts';
import { useAppSelector } from '../../store/useAppSelector.ts';
import { cx } from '../../utils/cx.ts';
import { ContactMenu } from '../ContactMenu/ContactMenu.tsx';
import { Icon } from '../Icon/Icon.tsx';
import styles from './ContactRow.module.css';

type Props = {
  contact: Contact;
  selected: boolean;
  dragging: boolean;
  onOpen: () => void;
  // Drag-to-reorder handlers from useDragSort.
  sortProps: Record<string, unknown>;
};

// One contact in the list: name, status and unread count (never a message preview).
export const ContactRow = ({ contact, selected, dragging, onOpen, sortProps }: Props) => {
  const status = useAppSelector(state => state.sessions.status[contact.id] ?? 'idle');
  const unread = useAppSelector(state => state.chat.unread[contact.id] ?? 0);
  const [menu, setMenu] = useState(false);

  const stop = (e: PointerEvent | MouseEvent) => e.stopPropagation();

  return (
    <div
      className={cx(styles.row, selected && styles.selected, dragging && styles.dragging)}
      role="button"
      tabIndex={0}
      aria-label={contact.name}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          onOpen();
        }
      }}
      {...sortProps}
    >
      <span className={styles.avatar}>
        {contact.name.trim().charAt(0).toUpperCase() || '?'}
        <span className={cx(styles.dot, styles[status])} />
      </span>
      <span className={styles.name}>{contact.name}</span>
      {contact.favourite && <span className={styles.star} title="Favourite"><Icon name="star" size={14} /></span>}
      {contact.verified && (
        <span className={styles.verified} title="Verified"><Icon name="shieldCheck" size={16} /></span>
      )}
      {unread > 0 && (
        <span className={styles.unread} aria-label={`${unread} unread`}>{unread > 99 ? '99+' : unread}</span>
      )}
      <button
        className={styles.more}
        type="button"
        aria-label={`Options for ${contact.name}`}
        onPointerDown={stop}
        onClick={(e) => {
          stop(e);
          setMenu(!menu);
        }}
      >
        <Icon name="more" />
      </button>
      {menu && <ContactMenu contact={contact} onClose={() => setMenu(false)} />}
    </div>
  );
};
