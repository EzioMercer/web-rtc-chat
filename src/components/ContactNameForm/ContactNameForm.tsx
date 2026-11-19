import { useId, useState, type FormEvent, type ReactNode } from 'react';
import { useAppSelector } from '../../store/useAppSelector.ts';
import { Button } from '../Button/Button.tsx';
import { TextField } from '../TextField/TextField.tsx';
import styles from './ContactNameForm.module.css';

type Props = {
  submitLabel: string;
  busy?: boolean;
  error?: string | null;
  children?: ReactNode;
  onSubmit: (name: string, replaceId: string | null) => void;
  onCancel: () => void;
  cancelLabel?: string;
};

// Names a new contact, and optionally marks it as an existing contact who has a new identity (e.g. a new phone).
export const ContactNameForm = ({ submitLabel, busy, error, children, onSubmit, onCancel, cancelLabel }: Props) => {
  const contacts = useAppSelector(state => state.contacts.list);
  const [name, setName] = useState('');
  const [replaceId, setReplaceId] = useState('');
  const selectId = useId();

  const submit = (e: FormEvent) => {
    e.preventDefault();
    onSubmit(name, replaceId || null);
  };

  return (
    <form className={styles.form} onSubmit={submit}>
      {children}
      <TextField
        label="Name"
        value={name}
        autoFocus
        placeholder="e.g. Alex"
        hint="Only you see this name."
        onChange={setName}
      />
      {contacts.length > 0 && (
        <div className={styles.field}>
          <label htmlFor={selectId}>This is</label>
          <select
            id={selectId}
            className={styles.select}
            value={replaceId}
            onChange={e => setReplaceId(e.target.value)}
          >
            <option value="">A new contact</option>
            {contacts.map(contact => (
              <option key={contact.id} value={contact.id}>{`${contact.name}, with a new device`}</option>
            ))}
          </select>
        </div>
      )}
      {error && <p className={styles.error}>{error}</p>}
      <Button type="submit" disabled={busy || (!name.trim() && !replaceId)}>
        {busy ? 'Please wait…' : submitLabel}
      </Button>
      <Button variant="secondary" onClick={onCancel}>{cancelLabel ?? 'Cancel'}</Button>
    </form>
  );
};
