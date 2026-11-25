import { useEffect, useRef, useState } from 'react';
import { chatsRead, markedUnread } from '../../../store/chat/chatSlice.ts';
import { favouriteToggled } from '../../../store/contacts/contactsSlice.ts';
import type { Contact } from '../../../store/contacts/types.ts';
import { clearConversation } from '../../../store/thunks/chat/clearConversation.ts';
import { deleteContact } from '../../../store/thunks/contact/deleteContact.ts';
import { useAppDispatch } from '../../../store/useAppDispatch.ts';
import { Button } from '../../../ui/Button/Button.tsx';
import { Dialog } from '../../../ui/Dialog/Dialog.tsx';
import { RenameDialog } from '../RenameDialog/RenameDialog.tsx';
import { useUnread } from '../useUnread.ts';
import styles from './ContactMenu.module.css';
import { ButtonVariant } from '../../../ui/Button/ButtonVariant.ts';

type Props = {
  contact: Contact;
  onClose: () => void;
};

// Mark as read or unread, rename, favourite, clear and delete, for one contact.
enum MenuDialog {
  Rename,
  Delete,
}

export const ContactMenu = ({ contact, onClose }: Props) => {
  const dispatch = useAppDispatch();
  const [dialog, setDialog] = useState<MenuDialog | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const { count, dot } = useUnread(contact.id);
  const unread = count > 0 || dot;

  // Clicking anywhere else closes the menu (unless a dialog from it is open).
  useEffect(() => {
    if (dialog) {
      return;
    }

    const onDown = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) {
        onClose();
      }
    };

    document.addEventListener('pointerdown', onDown);

    return () => document.removeEventListener('pointerdown', onDown);
  }, [dialog, onClose]);

  if (dialog === MenuDialog.Rename) {
    return <RenameDialog contact={contact} onClose={onClose} />;
  }

  if (dialog === MenuDialog.Delete) {
    return (
      <Dialog title={`Delete ${contact.name}?`} onClose={onClose}>
        <p>
          They will be removed from your contacts on this device. To talk again, one of you has to send a new invite.
        </p>
        <Button
          variant={ButtonVariant.Danger}
          onClick={() => {
            dispatch(deleteContact(contact.id));
            onClose();
          }}
        >
          Delete
        </Button>
        <Button variant={ButtonVariant.Secondary} onClick={onClose}>Cancel</Button>
      </Dialog>
    );
  }

  return (
    <div
      ref={ref}
      className={styles.menu}
      role="menu"
      onClick={e => e.stopPropagation()}
      onPointerDown={e => e.stopPropagation()}
    >
      <button
        className={styles.item}
        type="button"
        role="menuitem"
        onClick={() => {
          dispatch(unread ? chatsRead([contact.id]) : markedUnread(contact.id));
          onClose();
        }}
      >
        {unread ? 'Mark as read' : 'Mark as unread'}
      </button>
      <button className={styles.item} type="button" role="menuitem" onClick={() => setDialog(MenuDialog.Rename)}>
        Rename
      </button>
      <button
        className={styles.item}
        type="button"
        role="menuitem"
        onClick={() => {
          dispatch(favouriteToggled(contact.id));
          onClose();
        }}
      >
        {contact.favourite ? 'Remove from favourites' : 'Add to favourites'}
      </button>
      <button
        className={styles.item}
        type="button"
        role="menuitem"
        onClick={() => {
          dispatch(clearConversation(contact.id));
          onClose();
        }}
      >
        Clear conversation
      </button>
      <button className={styles.item} type="button" role="menuitem" onClick={() => setDialog(MenuDialog.Delete)}>
        <span className={styles.danger}>Delete</span>
      </button>
    </div>
  );
};
