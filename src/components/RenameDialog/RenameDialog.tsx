import { useState, type FormEvent } from 'react';
import { contactRenamed } from '../../store/contacts/contactsSlice.ts';
import type { Contact } from '../../store/contacts/types.ts';
import { useAppDispatch } from '../../store/useAppDispatch.ts';
import { Button } from '../Button/Button.tsx';
import { Dialog } from '../Dialog/Dialog.tsx';
import { TextField } from '../TextField/TextField.tsx';

type Props = {
  contact: Contact;
  onClose: () => void;
};

export const RenameDialog = ({ contact, onClose }: Props) => {
  const dispatch = useAppDispatch();
  const [name, setName] = useState(contact.name);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    dispatch(contactRenamed({ id: contact.id, name: name.trim() }));
    onClose();
  };

  return (
    <Dialog title="Rename contact" onClose={onClose}>
      <form onSubmit={submit} style={{ display: 'contents' }}>
        <TextField label="Name" value={name} autoFocus onChange={setName} hint="Only you see this name." />
        <Button type="submit" disabled={!name.trim()}>Save</Button>
      </form>
    </Dialog>
  );
};
