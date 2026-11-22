import { Button } from '../../../ui/Button/Button.tsx';
import styles from './SafetyPanel.module.css';

type Props = {
  words: string[] | null;
  verified?: boolean;
  onVerify?: () => void;
  onUnverify?: () => void;
};

// The safety code and what to do with it.
export const SafetyPanel = ({ words, verified, onVerify, onUnverify }: Props) => (
  <div className={styles.panel}>
    <div className={styles.words} aria-label="Safety code">
      {(words ?? ['…', '…', '…', '…']).map((word, i) => <span key={i} className={styles.word}>{word}</span>)}
    </div>
    <p className={styles.text}>
      Compare these with your friend in person or by voice. If they differ, someone is in the middle.
    </p>
    {onVerify && !verified && <Button onClick={onVerify}>They match: mark as verified</Button>}
    {onUnverify && verified && <Button variant="secondary" onClick={onUnverify}>Remove verification</Button>}
  </div>
);
