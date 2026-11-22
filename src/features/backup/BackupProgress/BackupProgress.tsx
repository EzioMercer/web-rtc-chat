import { useElapsed } from '../../../hooks/useElapsed.ts';
import { cancelBackup } from '../../../store/thunks/backup/cancelBackup.ts';
import { useAppSelector } from '../../../store/useAppSelector.ts';
import { Button } from '../../../ui/Button/Button.tsx';
import { formatWait } from '../../../utils/formatWait.ts';
import styles from './BackupProgress.module.css';
import { ButtonVariant } from '../../../ui/Button/ButtonVariant.ts';

// Wait this long before guessing the time left: the first moments (the password's key) say nothing about speed.
const GUESS_AFTER_MS = 2000;

// Covers the whole app while a backup is made or restored: nothing else can be done meanwhile, and the app is
// offline.
export const BackupProgress = () => {
  const { running, title, done, total, startedAt } = useAppSelector(state => state.backup);
  const elapsed = useElapsed(running ? startedAt : null);

  if (!running) {
    return null;
  }

  const fraction = total ? Math.min(1, done / total) : 0;
  const left = elapsed > GUESS_AFTER_MS && fraction > 0.01 ? (elapsed / fraction) * (1 - fraction) : null;

  return (
    <div className={styles.overlay} role="alertdialog" aria-modal="true" aria-label={title}>
      <div className={styles.card}>
        <h2 className={styles.title}>{title}</h2>
        <div
          className={styles.track}
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(fraction * 100)}
        >
          <div className={styles.bar} style={{ width: `${fraction * 100}%` }} />
        </div>
        <p className={styles.status}>
          {`${Math.round(fraction * 100)}%`}
          {left !== null && ` · ${formatWait(left)} left`}
        </p>
        <p className={styles.note}>
          The app is offline until this finishes. Keep this tab open and the screen on.
        </p>
        <Button variant={ButtonVariant.Secondary} onClick={cancelBackup}>Cancel</Button>
      </div>
    </div>
  );
};
