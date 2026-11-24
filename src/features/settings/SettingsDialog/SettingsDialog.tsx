import { useEffect, useState } from 'react';
import { relayStatus } from '../../../core/nostr/relayStatus.ts';
import { updateProtection } from '../../../store/thunks/app/updateProtection.ts';
import { resetApp } from '../../../store/thunks/app/resetApp.ts';
import { selectConversation } from '../../../store/thunks/chat/selectConversation.ts';
import { useAppDispatch } from '../../../store/useAppDispatch.ts';
import { useAppSelector } from '../../../store/useAppSelector.ts';
import { echoGuardChosen } from '../../../store/settings/settingsSlice.ts';
import { EchoGuardSetting } from '../../../store/settings/types.ts';
import { MANUAL_KEY } from '../../../core/webrtc/config.ts';
import { Button } from '../../../ui/Button/Button.tsx';
import { ConfirmDialog } from '../../../ui/ConfirmDialog/ConfirmDialog.tsx';
import { Dialog } from '../../../ui/Dialog/Dialog.tsx';
import { ExportDialog } from '../../backup/ExportDialog/ExportDialog.tsx';
import { ImportDialog } from '../../backup/ImportDialog/ImportDialog.tsx';
import { LegalDialog } from '../LegalDialog/LegalDialog.tsx';
import type { ProfileDialog } from '../ProfileDialog/ProfileDialog.tsx';
import { loadProfileDialog } from '../ProfileDialog/loadProfileDialog.ts';
import { ProfileRow } from '../ProfileRow/ProfileRow.tsx';
import { StorageSection } from '../StorageSection/StorageSection.tsx';
import { ProtectionPicker } from '../../setup/ProtectionPicker/ProtectionPicker.tsx';
import { SegmentedControl } from '../../../ui/SegmentedControl/SegmentedControl.tsx';
import { MODE_LABELS } from './MODE_LABELS.ts';
import styles from './SettingsDialog.module.css';
import { type ProtectionChoice, ProtectionMode } from '../../../core/identity/types.ts';
import { ButtonVariant } from '../../../ui/Button/ButtonVariant.ts';

type Props = {
  onClose: () => void;
};

const ECHO_GUARD_OPTIONS: { value: EchoGuardSetting; label: string }[] = [
  { value: EchoGuardSetting.Auto, label: 'Auto' },
  { value: EchoGuardSetting.On, label: 'On' },
  { value: EchoGuardSetting.Off, label: 'Off' },
];

export const SettingsDialog = ({ onClose }: Props) => {
  const dispatch = useAppDispatch();
  const { mode, busy, error } = useAppSelector(state => state.app);
  const echoGuard = useAppSelector(state => state.settings.echoGuard);
  const [changing, setChanging] = useState(false);
  const [legal, setLegal] = useState(false);
  // The Profile info window, once its code is loaded and it is open.
  const [Profile, setProfile] = useState<typeof ProfileDialog | null>(null);
  const [profileError, setProfileError] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  // Going temporary waits for a yes: it deletes what is saved on this device.
  const [toTemporary, setToTemporary] = useState<ProtectionChoice | null>(null);
  const [resetting, setResetting] = useState(false);
  const [relays, setRelays] = useState(relayStatus);

  // Loaded now, so tapping Profile info opens it at once.
  useEffect(() => {
    loadProfileDialog().catch(() => undefined);
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => setRelays(relayStatus()), 2000);

    return () => window.clearInterval(timer);
  }, []);

  if (Profile) {
    return <Profile onBack={() => setProfile(null)} onClose={onClose} />;
  }

  // Settings stays until the window's code is there (it usually is already).
  const openProfile = async () => {
    try {
      const module = await loadProfileDialog();

      setProfileError(false);
      setProfile(() => module.ProfileDialog);
    } catch {
      setProfileError(true);
    }
  };

  if (legal) {
    return <LegalDialog onBack={() => setLegal(false)} onClose={onClose} />;
  }

  if (exporting) {
    return <ExportDialog onBack={() => setExporting(false)} onClose={onClose} />;
  }

  if (importing) {
    return <ImportDialog fresh={false} onBack={() => setImporting(false)} onClose={onClose} />;
  }

  if (resetting) {
    return (
      <ConfirmDialog
        title="Delete everything?"
        confirmLabel="Delete"
        danger
        onConfirm={() => void resetApp()}
        onCancel={() => setResetting(false)}
      >
        Your identity, contacts and chats will be deleted from this device. This can&apos;t be undone.
      </ConfirmDialog>
    );
  }

  if (changing) {
    const switchTo = async (choice: ProtectionChoice) => {
      if (await dispatch(updateProtection(choice))) {
        setChanging(false);
      }
    };

    return (
      <>
        <Dialog title="Change protection" onBack={() => setChanging(false)} onClose={onClose}>
          <ProtectionPicker
            submitLabel="Switch"
            busy={busy}
            error={error}
            current={mode}
            onSubmit={(choice) => {
              if (choice.mode === ProtectionMode.Temporary && mode !== ProtectionMode.Temporary) {
                setToTemporary(choice);
              } else {
                void switchTo(choice);
              }
            }}
          />
        </Dialog>
        {toTemporary && (
          <ConfirmDialog
            title="Switch to temporary?"
            confirmLabel="Switch"
            danger
            onConfirm={() => {
              setToTemporary(null);
              void switchTo(toTemporary);
            }}
            onCancel={() => setToTemporary(null)}
          >
            Your identity, contacts and chats will be deleted from this device. They stay only in this tab and
            disappear when it closes. Make a backup first to keep them.
          </ConfirmDialog>
        )}
      </>
    );
  }

  return (
    <Dialog title="Settings" onClose={onClose}>
      <ProfileRow onOpen={() => void openProfile()} />
      {profileError && <p className={styles.loadError}>Couldn&apos;t load it. Check the connection and try again.</p>}

      <section className={styles.section}>
        <h3>Protection</h3>
        <p>{mode ? MODE_LABELS[mode] : ''}</p>
        <Button variant={ButtonVariant.Secondary} onClick={() => setChanging(true)}>Change protection</Button>
        {(mode === ProtectionMode.Passkey || mode === ProtectionMode.Passphrase) && (
          <Button variant={ButtonVariant.Secondary} onClick={() => window.location.reload()}>Lock now</Button>
        )}
      </section>

      <StorageSection onExport={() => setExporting(true)} onImport={() => setImporting(true)} />

      <section className={styles.section}>
        <div className={styles.titleRow}>
          <h3 id="echo-guard-title">Echo guard</h3>
          <SegmentedControl
            labelledBy="echo-guard-title"
            options={ECHO_GUARD_OPTIONS}
            value={echoGuard}
            onChange={value => dispatch(echoGuardChosen(value))}
          />
        </div>
        <p>
          If the other person hears their own voice back, your microphone is picking up your speaker. Echo guard
          turns your microphone down while only they are talking.
        </p>
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
          variant={ButtonVariant.Secondary}
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
        <Button variant={ButtonVariant.Secondary} onClick={() => setLegal(true)}>Legal</Button>
      </section>

      <section className={styles.section}>
        <h3>This device</h3>
        <Button variant={ButtonVariant.Danger} onClick={() => setResetting(true)}>
          Delete identity, contacts and chats
        </Button>
      </section>
    </Dialog>
  );
};
