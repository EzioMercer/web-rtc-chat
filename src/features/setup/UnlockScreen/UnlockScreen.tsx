import { useState, type FormEvent } from 'react';
import { resetApp } from '../../../store/thunks/app/resetApp.ts';
import { unlockApp } from '../../../store/thunks/app/unlockApp.ts';
import { useAppDispatch } from '../../../store/useAppDispatch.ts';
import { useAppSelector } from '../../../store/useAppSelector.ts';
import { Button } from '../../../ui/Button/Button.tsx';
import { ConfirmDialog } from '../../../ui/ConfirmDialog/ConfirmDialog.tsx';
import { Icon } from '../../../ui/Icon/Icon.tsx';
import { TextField } from '../../../ui/TextField/TextField.tsx';
import styles from './UnlockScreen.module.css';
import { ProtectionMode } from '../../../core/identity/types.ts';
import { ButtonType } from '../../../ui/Button/ButtonType.ts';
import { ButtonVariant } from '../../../ui/Button/ButtonVariant.ts';
import { TextFieldType } from '../../../ui/TextField/TextFieldType.ts';

export const UnlockScreen = () => {
  const dispatch = useAppDispatch();
  const { busy, error, lockedMode } = useAppSelector(state => state.app);
  const [passphrase, setPassphrase] = useState('');
  const [resetting, setResetting] = useState(false);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    void dispatch(unlockApp(lockedMode === ProtectionMode.Passphrase ? passphrase : undefined));
  };

  return (
    <form className={styles.screen} onSubmit={submit}>
      <span className={styles.icon}><Icon name="lock" size={32} /></span>
      <h1 className={styles.title}>Unlock P2P Chat</h1>
      {lockedMode === ProtectionMode.Passphrase && (
        <TextField
          label="Passphrase"
          type={TextFieldType.Password}
          value={passphrase}
          autoFocus
          onChange={setPassphrase}
        />
      )}
      {error && <p className={styles.error}>{error}</p>}
      <Button
        type={ButtonType.Submit}
        wide
        disabled={busy || (lockedMode === ProtectionMode.Passphrase && !passphrase)}
      >
        {busy ? 'Unlocking…' : lockedMode === ProtectionMode.Passkey ? 'Unlock with passkey' : 'Unlock'}
      </Button>
      <Button variant={ButtonVariant.Ghost} onClick={() => setResetting(true)}>Start over with a new identity</Button>
      {resetting && (
        <ConfirmDialog
          title="Start over?"
          confirmLabel="Delete"
          danger
          onConfirm={() => void resetApp()}
          onCancel={() => setResetting(false)}
        >
          Your identity, contacts and chats will be deleted from this device. This can&apos;t be undone.
        </ConfirmDialog>
      )}
    </form>
  );
};
