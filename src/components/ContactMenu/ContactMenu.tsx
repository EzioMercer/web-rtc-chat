import { useEffect, useRef, useState } from 'react';
import { favouriteToggled } from '../../store/contacts/contactsSlice.ts';
import type { Contact } from '../../store/contacts/types.ts';
import { clearConversation } from '../../store/thunks/chat/clearConversation.ts';
import { deleteContact } from '../../store/thunks/contact/deleteContact.ts';
import { useAppDispatch } from '../../store/useAppDispatch.ts';
import { Button } from '../Button/Button.tsx';
import { Dialog } from '../Dialog/Dialog.tsx';
import { RenameDialog } from '../RenameDialog/RenameDialog.tsx';
import styles from './ContactMenu.module.css';

type Props = {
  contact: Contact;
  onClose: () => void;
};

// Rename, favourite and delete, for one contact.
export const ContactMenu = ({ contact, onClose }: Props) => {
  const dispatch = useAppDispatch();
  const [dialog, setDialog] = useState<'rename' | 'delete' | null>(null);
  const ref = useRef<HTMLDivElement>(null);

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

  if (dialog === 'rename') {
    return <RenameDialog contact={contact} onClose={onClose} />;
  }

  if (dialog === 'delete') {
    return (
      <Dialog title={`Delete ${contact.name}?`} onClose={onClose}>
        <p>
          They will be removed from your contacts on this device. To talk again, one of you has to send a new invite.
        </p>
        <Button
          variant="danger"
          onClick={() => {
            dispatch(deleteContact(contact.id));
            onClose();
          }}
        >
          Delete
        </Button>
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
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
      <button className={styles.item} type="button" role="menuitem" onClick={() => setDialog('rename')}>
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
      <button className={styles.item} type="button" role="menuitem" onClick={() => setDialog('delete')}>
        <span className={styles.danger}>Delete</span>
      </button>
    </div>
  );
};
