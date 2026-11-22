import { useState } from 'react';
import { useNewVersion } from '../useNewVersion.ts';
import { useAppSelector } from '../../../store/useAppSelector.ts';
import { Button } from '../../../ui/Button/Button.tsx';
import styles from './UpdateNotice.module.css';

// Says that a new version is out. Reloading is optional: it clears this tab's chats (and a temporary identity).
export const UpdateNotice = () => {
  const latest = useNewVersion();
  const temporary = useAppSelector(state => state.app.mode === 'temporary');
  const [dismissed, setDismissed] = useState<string | null>(null);

  if (!latest || latest === dismissed) {
    return null;
  }

  const loses = temporary ? 'the chats in this tab and your temporary identity' : 'the chats in this tab';

  return (
    <div className={styles.notice} role="status">
      <span>
        <b>A new version is available.</b>
        {` Reloading clears ${loses}.`}
      </span>
      <div className={styles.actions}>
        <Button variant="ghost" onClick={() => setDismissed(latest)}>Later</Button>
        <Button onClick={() => window.location.reload()}>Reload</Button>
      </div>
    </div>
  );
};
