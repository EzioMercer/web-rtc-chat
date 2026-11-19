import type { ChangeEvent } from 'react';
import { restoreBackup } from '../../store/thunks/app/restoreBackup.ts';
import { setupIdentity } from '../../store/thunks/app/setupIdentity.ts';
import { useAppDispatch } from '../../store/useAppDispatch.ts';
import { useAppSelector } from '../../store/useAppSelector.ts';
import { ProtectionPicker } from '../ProtectionPicker/ProtectionPicker.tsx';
import styles from './SetupScreen.module.css';

// First launch: no account, just choose how this device protects your new identity.
export const SetupScreen = () => {
  const dispatch = useAppDispatch();
  const { busy, error } = useAppSelector(state => state.app);

  const restore = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];

    e.target.value = '';

    if (file) {
      await dispatch(restoreBackup(await file.text()));
    }
  };

  return (
    <section className={styles.screen}>
      <h1 className={styles.title}>P2P Chat</h1>
      <p className={styles.lead}>
        No sign-up, email or phone number. Your identity is a key created on this device.
        Choose how to protect it:
      </p>
      <ProtectionPicker
        submitLabel="Create my identity"
        busy={busy}
        error={error}
        onSubmit={choice => dispatch(setupIdentity(choice))}
      />
      <label className={styles.restore}>
        Restore from a backup file
        <input type="file" accept="application/json,.json" hidden onChange={restore} />
      </label>
    </section>
  );
};
