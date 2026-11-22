import { selectConversation } from '../../../store/thunks/chat/selectConversation.ts';
import { useAppDispatch } from '../../../store/useAppDispatch.ts';
import { useAppSelector } from '../../../store/useAppSelector.ts';
import { cx } from '../../../utils/cx.ts';
import { MANUAL_KEY } from '../../../core/webrtc/config.ts';
import { Icon } from '../../../ui/Icon/Icon.tsx';
import { ContactGroup } from './ContactGroup.tsx';
import styles from './ContactList.module.css';

export const ContactList = () => {
  const dispatch = useAppDispatch();
  const list = useAppSelector(state => state.contacts.list);
  const selected = useAppSelector(state => state.ui.selected);
  const manualActive = useAppSelector(state => state.manual.status !== 'idle');
  const manualUnread = useAppSelector(state => state.chat.unread[MANUAL_KEY] ?? 0);
  const favourites = list.filter(contact => contact.favourite);
  const others = list.filter(contact => !contact.favourite);

  return (
    <nav className={styles.list} aria-label="Contacts">
      {(manualActive || selected === MANUAL_KEY) && (
        <button
          className={cx(styles.manual, selected === MANUAL_KEY && styles.selected)}
          type="button"
          onClick={() => dispatch(selectConversation(MANUAL_KEY))}
        >
          <Icon name="link" />
          <span>Manual connection</span>
          {manualUnread > 0 && <span className={styles.unread}>{manualUnread}</span>}
        </button>
      )}
      <ContactGroup title={favourites.length ? 'Favourites' : null} contacts={favourites} />
      <ContactGroup title={favourites.length && others.length ? 'Contacts' : null} contacts={others} />
      {!list.length && (
        <p className={styles.empty}>
          No contacts yet. Tap
          {' '}
          <b>Add contact</b>
          {' '}
          to show your invite QR code, or open one a friend sent you.
        </p>
      )}
    </nav>
  );
};
