import { useState } from 'react';
import { estimateBits } from '../../../core/identity/passphrase/estimateBits.ts';
import { generatePassphrase } from '../../../core/identity/passphrase/generatePassphrase.ts';
import { WEAK_BITS } from '../../../core/identity/passphrase/WEAK_BITS.ts';
import { Button } from '../../../ui/Button/Button.tsx';
import { TextField } from '../../../ui/TextField/TextField.tsx';
import styles from '../backup.module.css';
import { ButtonVariant } from '../../../ui/Button/ButtonVariant.ts';
import { TextFieldType } from '../../../ui/TextField/TextFieldType.ts';

const WEAK_TEXT = 'This looks weak. Anyone with the file could guess it: use 5 or more random words.';

type Props = {
  password: string;
  repeat: string;
  onChange: (password: string, repeat: string) => void;
};

// The backup's own password, typed twice (or a suggested one), with a warning when it looks weak.
export const NewPasswordFields = ({ password, repeat, onChange }: Props) => {
  const [visible, setVisible] = useState(false);
  const weak = password.length > 0 && estimateBits(password) < WEAK_BITS;
  const mismatch = repeat.length > 0 && repeat !== password;

  const suggest = () => {
    const words = generatePassphrase();

    setVisible(true);
    onChange(words, words);
  };

  return (
    <>
      <TextField
        label="Backup password"
        type={visible ? TextFieldType.Text : TextFieldType.Password}
        value={password}
        onChange={value => onChange(value, repeat)}
        hint={weak
          ? <span className={styles.warn}>{WEAK_TEXT}</span>
          : 'Only this password opens the file. If you forget it, the backup is lost.'}
        action={(
          <>
            <Button variant={ButtonVariant.Secondary} onClick={() => setVisible(!visible)}>
              {visible ? 'Hide' : 'Show'}
            </Button>
            <Button variant={ButtonVariant.Secondary} onClick={suggest}>Suggest</Button>
          </>
        )}
      />
      <TextField
        label="Repeat the password"
        type={visible ? TextFieldType.Text : TextFieldType.Password}
        value={repeat}
        onChange={value => onChange(password, value)}
        hint={mismatch ? <span className={styles.warn}>The two passwords differ.</span> : undefined}
      />
    </>
  );
};
