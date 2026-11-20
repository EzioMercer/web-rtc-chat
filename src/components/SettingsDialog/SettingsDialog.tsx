import { useEffect, useState } from 'react';
import { relayStatus } from '../../nostr/relayStatus.ts';
import { updateProtection } from '../../store/thunks/app/updateProtection.ts';
import { resetApp } from '../../store/thunks/app/resetApp.ts';
import { selectConversation } from '../../store/thunks/chat/selectConversation.ts';
import { useAppDispatch } from '../../store/useAppDispatch.ts';
import { useAppSelector } from '../../store/useAppSelector.ts';
import { MANUAL_KEY } from '../../webrtc/config.ts';
import { Button } from '../Button/Button.tsx';
import { Dialog } from '../Dialog/Dialog.tsx';
import { LegalDialog } from '../LegalDialog/LegalDialog.tsx';
import { ProtectionPicker } from '../ProtectionPicker/ProtectionPicker.tsx';
import { downloadBackup } from './downloadBackup.ts';
import { MODE_LABELS } from './MODE_LABELS.ts';
import styles from './SettingsDialog.module.css';

type Props = {
  onClose: () => void;
};

export const SettingsDialog = ({ onClose }: Props) => {
  const dispatch = useAppDispatch();
  const { mode, busy, error } = useAppSelector(state => state.app);
  const [changing, setChanging] = useState(false);
  const [legal, setLegal] = useState(false);
  const [relays, setRelays] = useState(relayStatus);
  const canBackup = mode === 'passkey' || mode === 'passphrase';

  useEffect(() => {
    const timer = window.setInterval(() => setRelays(relayStatus()), 2000);

    return () => window.clearInterval(timer);
  }, []);

  if (legal) {
    return <LegalDialog onClose={() => setLegal(false)} />;
  }

  if (changing) {
    return (
      <Dialog title="Change protection" onClose={() => setChanging(false)}>
        <ProtectionPicker
          submitLabel="Switch"
          busy={busy}
          error={error}
          current={mode}
          onSubmit={async (choice) => {
            if (await dispatch(updateProtection(choice))) {
              setChanging(false);
            }
          }}
        />
      </Dialog>
    );
  }

  const reset = () => {
    if (window.confirm('Delete your identity and contacts from this device? This can\'t be undone.')) {
      void resetApp();
    }
  };

  return (
    <Dialog title="Settings" onClose={onClose}>
      <section className={styles.section}>
        <h3>Protection</h3>
        <p>{mode ? MODE_LABELS[mode] : ''}</p>
        <Button variant="secondary" onClick={() => setChanging(true)}>Change protection</Button>
        {(mode === 'passkey' || mode === 'passphrase') && (
          <Button variant="secondary" onClick={() => window.location.reload()}>Lock now</Button>
        )}
      </section>

      <section className={styles.section}>
        <h3>Backup</h3>
        <p>
          {canBackup
            ? 'Download your encrypted identity and contacts. Only your passkey or passphrase can open the file. '
            + 'Messages are never included.'
            : 'Backups need passkey or passphrase protection.'}
        </p>
        <Button variant="secondary" disabled={!canBackup} onClick={() => void downloadBackup()}>Download backup</Button>
      </section>

      <section className={styles.section}>
        <h3>Relays</h3>
        <p>
          {relays.connected
            ? `${relays.connected} of ${relays.total} relays connected. They only pass on connection requests.`
            : 'Not connected right now. Relays are only used while you have contacts or an open invite.'}
        </p>
      </section>

      <section className={styles.section}>
        <h3>Connect manually</h3>
        <p>Copy codes by hand, without contacts or relays. Nothing is saved.</p>
        <Button
          variant="secondary"
          onClick={() => {
            dispatch(selectConversation(MANUAL_KEY));
            onClose();
          }}
        >
          Connect manually
        </Button>
      </section>

      <section className={styles.section}>
        <h3>Legal</h3>
        <p>Disclaimer, privacy notice and donations.</p>
        <Button variant="secondary" onClick={() => setLegal(true)}>Legal</Button>
      </section>

      <section className={styles.section}>
        <h3>This device</h3>
        <Button variant="danger" onClick={reset}>Delete identity and contacts</Button>
      </section>
    </Dialog>
  );
};
