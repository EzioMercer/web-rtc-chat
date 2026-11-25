import { useState, type PointerEvent, type MouseEvent } from 'react';
import type { Contact } from '../../../store/contacts/types.ts';
import { useAppSelector } from '../../../store/useAppSelector.ts';
import { cx } from '../../../utils/cx.ts';
import { ContactMenu } from '../ContactMenu/ContactMenu.tsx';
import { Avatar } from '../../../ui/Avatar/Avatar.tsx';
import { Icon } from '../../../ui/Icon/Icon.tsx';
import { SessionStatus } from '../../../store/sessions/types.ts';
import { useUnread } from '../useUnread.ts';
import styles from './ContactRow.module.css';

type Props = {
  contact: Contact;
  selected: boolean;
  dragging: boolean;
  onOpen: () => void;
  // Drag-to-reorder handlers from useDragSort.
  sortProps: Record<string, unknown>;
};

// One contact in the list: picture, name, status and unread count, or a dot when marked as unread (never a message
// preview).
// The status dot's colour (grey otherwise).
const DOT_CLASSES: Partial<Record<SessionStatus, string>> = {
  [SessionStatus.Connecting]: styles.connecting,
  [SessionStatus.Connected]: styles.connected,
};

export const ContactRow = ({ contact, selected, dragging, onOpen, sortProps }: Props) => {
  const status = useAppSelector(state => state.sessions.status[contact.id] ?? SessionStatus.Idle);
  const { count, dot } = useUnread(contact.id);
  const unread = count > 0 || dot;
  const [menu, setMenu] = useState(false);

  const stop = (e: PointerEvent | MouseEvent) => e.stopPropagation();

  return (
    // The row holds two buttons side by side (open the chat, and its menu), never one inside the other.
    <div className={cx(styles.row, selected && styles.selected, dragging && styles.dragging)} {...sortProps}>
      <button
        className={styles.open}
        type="button"
        aria-label={count > 0 ? `${contact.name}, ${count} unread` : dot ? `${contact.name}, unread` : contact.name}
        onClick={onOpen}
      >
        <Avatar picture={contact.picture} name={contact.name} size={40} className={styles.avatar}>
          <span className={cx(styles.dot, DOT_CLASSES[status])} />
        </Avatar>
        <span className={styles.name}>{contact.name}</span>
        {contact.favourite && <span className={styles.star} title="Favourite"><Icon name="star" size={14} /></span>}
        {contact.verified && (
          <span className={styles.verified} title="Verified"><Icon name="shieldCheck" size={16} /></span>
        )}
        {unread && (
          <span className={cx(styles.unread, !count && styles.unreadDot)} aria-hidden="true">
            {count > 99 ? '99+' : count || null}
          </span>
        )}
      </button>
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
