import { exportBackup } from '../../../core/identity/exportBackup.ts';

// Saves the encrypted identity and contacts as a file. It can only be opened with the same passkey or passphrase.
export const downloadBackup = async () => {
  const backup = await exportBackup();
  const url = URL.createObjectURL(new Blob([JSON.stringify(backup)], { type: 'application/json' }));
  const link = document.createElement('a');

  link.href = url;
  link.download = 'p2p-chat-identity-backup.json';
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
};
