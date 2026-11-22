import { Button } from '../../../ui/Button/Button.tsx';
import styles from './SafetyPanel.module.css';
import { ButtonVariant } from '../../../ui/Button/ButtonVariant.ts';
import type { SafetyEmoji } from '../../../core/crypto/types.ts';
import { INVITE_CODE_LENGTH } from '../../../core/signaling/config.ts';

type Props = {
  code: SafetyEmoji[] | null;
  verified?: boolean;
  onVerify?: () => void;
  onUnverify?: () => void;
};

// The safety code and what to do with it.
export const SafetyPanel = ({ code, verified, onVerify, onUnverify }: Props) => (
  <div className={styles.panel}>
    <ol className={styles.code} aria-label="Safety code">
      {(code ?? Array<null>(INVITE_CODE_LENGTH).fill(null)).map((item, i) => (
        <li key={i} className={styles.item}>
          <span className={styles.emoji} aria-hidden="true">{item?.emoji ?? '…'}</span>
          <span className={styles.name}>{item?.name ?? ' '}</span>
        </li>
      ))}
    </ol>
    <p className={styles.text}>
      Compare these with your friend in person or by voice. If they differ, someone is in the middle.
    </p>
    {onVerify && !verified && <Button onClick={onVerify}>They match: mark as verified</Button>}
    {onUnverify && verified && (
      <Button variant={ButtonVariant.Secondary} onClick={onUnverify}>Remove verification</Button>
    )}
  </div>
);
