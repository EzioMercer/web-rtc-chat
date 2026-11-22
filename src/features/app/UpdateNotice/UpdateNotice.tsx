import { useState } from 'react';
import { useNewVersion } from '../useNewVersion.ts';
import { useAppSelector } from '../../../store/useAppSelector.ts';
import { Button } from '../../../ui/Button/Button.tsx';
import styles from './UpdateNotice.module.css';
import { ProtectionMode } from '../../../core/identity/types.ts';
import { ButtonVariant } from '../../../ui/Button/ButtonVariant.ts';

// Says that a new version is out. Reloading is optional: saved chats stay, but files on their way stop (and a
// temporary identity loses everything).
export const UpdateNotice = () => {
  const latest = useNewVersion();
  const temporary = useAppSelector(state => state.app.mode === ProtectionMode.Temporary);
  const [dismissed, setDismissed] = useState<string | null>(null);

  if (!latest || latest === dismissed) {
    return null;
  }

  const loses = temporary
    ? ' Reloading clears the chats in this tab and your temporary identity.'
    : ' Your chats stay; only files still on their way stop.';

  return (
    <div className={styles.notice} role="status">
      <span>
        <b>A new version is available.</b>
        {loses}
      </span>
      <div className={styles.actions}>
        <Button variant={ButtonVariant.Ghost} onClick={() => setDismissed(latest)}>Later</Button>
        <Button onClick={() => window.location.reload()}>Reload</Button>
      </div>
    </div>
  );
};
