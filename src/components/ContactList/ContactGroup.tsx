import { useDragSort } from '../../hooks/useDragSort.ts';
import { contactMoved } from '../../store/contacts/contactsSlice.ts';
import type { Contact } from '../../store/contacts/types.ts';
import { selectConversation } from '../../store/thunks/chat/selectConversation.ts';
import { useAppDispatch } from '../../store/useAppDispatch.ts';
import { useAppSelector } from '../../store/useAppSelector.ts';
import { ContactRow } from '../ContactRow/ContactRow.tsx';
import styles from './ContactList.module.css';

type Props = {
  title: string | null;
  contacts: Contact[];
};

// Favourites or the other contacts, reorderable by dragging within the group.
export const ContactGroup = ({ title, contacts }: Props) => {
  const dispatch = useAppDispatch();
  const selected = useAppSelector(state => state.ui.selected);
  const ids = contacts.map(contact => contact.id);
  const { listRef, order, draggingId, suppressClick, rowProps } = useDragSort(
    ids,
    (id, beforeId) => dispatch(contactMoved({ id, beforeId })),
  );
  const byId = new Map(contacts.map(contact => [contact.id, contact]));

  if (!contacts.length) {
    return null;
  }

  return (
    <div ref={listRef} className={styles.group}>
      {title && <h3 className={styles.title}>{title}</h3>}
      {order.map((id) => {
        const contact = byId.get(id);

        return contact && (
          <ContactRow
            key={id}
            contact={contact}
            selected={selected === id}
            dragging={draggingId === id}
            sortProps={rowProps(id)}
            onOpen={() => {
              if (!suppressClick.current) {
                dispatch(selectConversation(id));
              }
            }}
          />
        );
      })}
    </div>
  );
};
