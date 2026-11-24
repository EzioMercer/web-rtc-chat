import { useEffect, useState } from 'react';
import { isStoragePersistent } from '../../../core/storage/isStoragePersistent.ts';
import { storageUsage } from '../../../core/storage/storageUsage.ts';
import { ProtectionMode } from '../../../core/identity/types.ts';
import { useAppSelector } from '../../../store/useAppSelector.ts';
import { Button } from '../../../ui/Button/Button.tsx';
import { formatBytes } from '../../../utils/formatBytes.ts';
import { isIosBrowser } from '../../../utils/isIosBrowser.ts';
import styles from '../SettingsDialog/SettingsDialog.module.css';
import { ButtonVariant } from '../../../ui/Button/ButtonVariant.ts';

type Props = {
  onExport: () => void;
  onImport: () => void;
};

// Where the chats are kept, how safe that is from the browser cleaning up, and backups.
export const StorageSection = ({ onExport, onImport }: Props) => {
  const temporary = useAppSelector(state => state.app.mode === ProtectionMode.Temporary);
  const [used, setUsed] = useState<number | null>(null);
  const [persistent, setPersistent] = useState(false);

  useEffect(() => {
    void storageUsage().then(usage => setUsed(usage?.used ?? null));
    void isStoragePersistent().then(setPersistent);
  }, []);

  const saved = () => {
    if (temporary) {
      return 'Temporary: chats are kept only in this tab and disappear when it closes.';
    }

    // The browser counts everything the app keeps (keys, contacts, settings, its own overhead), not only chats.
    const size = used === null ? '' : ` This app uses ${formatBytes(used)} here.`;

    return persistent
      ? `Chats are saved on this device, encrypted.${size} The browser won't delete them on its own.`
      : `Chats are saved on this device, encrypted.${size} The browser may delete them when space runs low: `
        + 'installing the app makes that less likely. Keep a backup.';
  };

  return (
    <section className={styles.section}>
      <h3>Chats and backup</h3>
      <p>{saved()}</p>
      {!temporary && isIosBrowser() && (
        <p className={styles.warn}>
          On iPhone and iPad, Safari deletes saved chats after 7 days without a visit. Add the app to the Home
          Screen (Share, then Add to Home Screen) to keep them.
        </p>
      )}
      <p>A backup file holds your contacts and chats, locked with a password, to move them to another device.</p>
      <div className={styles.buttons}>
        <Button variant={ButtonVariant.Secondary} onClick={onExport}>Back up</Button>
        <Button variant={ButtonVariant.Secondary} onClick={onImport}>Restore</Button>
      </div>
    </section>
  );
};
