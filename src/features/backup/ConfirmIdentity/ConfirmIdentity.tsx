import { useState, type FormEvent } from 'react';
import { confirmIdentity } from '../../../core/identity/confirmIdentity.ts';
import { ProtectionMode } from '../../../core/identity/types.ts';
import { errorMessage } from '../../../store/thunks/app/errorMessage.ts';
import { useAppSelector } from '../../../store/useAppSelector.ts';
import { Button } from '../../../ui/Button/Button.tsx';
import { TextField } from '../../../ui/TextField/TextField.tsx';
import styles from '../backup.module.css';
import { ButtonType } from '../../../ui/Button/ButtonType.ts';
import { TextFieldType } from '../../../ui/TextField/TextFieldType.ts';

type Props = {
  onConfirmed: () => void;
};

// Asks for the passkey or passphrase again before a backup: someone holding the unlocked device for a moment must
// not be able to take every chat with them.
export const ConfirmIdentity = ({ onConfirmed }: Props) => {
  const mode = useAppSelector(state => state.app.mode);
  const [passphrase, setPassphrase] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const withPassphrase = mode === ProtectionMode.Passphrase;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);

    try {
      await confirmIdentity(withPassphrase ? passphrase : undefined);
      onConfirmed();
    } catch (err) {
      setError(errorMessage(err));
      setBusy(false);
    }
  };

  return (
    <form className={styles.form} onSubmit={e => void submit(e)}>
      <p className={styles.text}>A backup holds all your chats, so confirm it&apos;s you first.</p>
      {withPassphrase && (
        <TextField
          label="Passphrase"
          type={TextFieldType.Password}
          value={passphrase}
          autoFocus
          onChange={setPassphrase}
        />
      )}
      {error && <p className={styles.error}>{error}</p>}
      <Button type={ButtonType.Submit} wide disabled={busy || (withPassphrase && !passphrase)}>
        {withPassphrase ? 'Confirm' : 'Confirm with passkey'}
      </Button>
    </form>
  );
};
