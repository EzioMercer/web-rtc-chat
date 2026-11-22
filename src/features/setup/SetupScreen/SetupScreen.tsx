import { useState } from 'react';
import { setupIdentity } from '../../../store/thunks/app/setupIdentity.ts';
import { useAppDispatch } from '../../../store/useAppDispatch.ts';
import { useAppSelector } from '../../../store/useAppSelector.ts';
import { ImportDialog } from '../../backup/ImportDialog/ImportDialog.tsx';
import { LegalDialog } from '../../settings/LegalDialog/LegalDialog.tsx';
import { Logo } from '../../../ui/Logo/Logo.tsx';
import { ProtectionPicker } from '../ProtectionPicker/ProtectionPicker.tsx';
import styles from './SetupScreen.module.css';

// First launch: no account, just choose how this device protects your new identity.
export const SetupScreen = () => {
  const dispatch = useAppDispatch();
  const { busy, error } = useAppSelector(state => state.app);
  const [legal, setLegal] = useState(false);
  const [restoring, setRestoring] = useState(false);

  return (
    <section className={styles.screen}>
      <h1 className={styles.title}>
        <Logo size={56} />
        P2P Chat
      </h1>
      <p className={styles.lead}>
        No sign-up, email or phone number. Your identity is keys created on this device, a new one for each contact.
        Choose how to protect them:
      </p>
      <ProtectionPicker
        submitLabel="Create my identity"
        busy={busy}
        error={error}
        onSubmit={choice => dispatch(setupIdentity(choice))}
      />
      <p className={styles.legal}>
        By using this app, you accept the
        {' '}
        <button type="button" className={styles.legalLink} onClick={() => setLegal(true)}>
          disclaimer and privacy notice
        </button>
        .
      </p>
      <button type="button" className={styles.restore} onClick={() => setRestoring(true)}>
        Restore from a backup file
      </button>
      {legal && <LegalDialog onClose={() => setLegal(false)} />}
      {restoring && <ImportDialog fresh onClose={() => setRestoring(false)} />}
    </section>
  );
};
