import { useEffect, useState, type FormEvent } from 'react';
import { isPasskeySupported } from '../../../core/identity/passkey/isPasskeySupported.ts';
import { estimateBits } from '../../../core/identity/passphrase/estimateBits.ts';
import { generatePassphrase } from '../../../core/identity/passphrase/generatePassphrase.ts';
import { WEAK_BITS } from '../../../core/identity/passphrase/WEAK_BITS.ts';
import { type ProtectionChoice, ProtectionMode } from '../../../core/identity/types.ts';
import { cx } from '../../../utils/cx.ts';
import { Button } from '../../../ui/Button/Button.tsx';
import { TextField } from '../../../ui/TextField/TextField.tsx';
import { OPTIONS } from './OPTIONS.ts';
import styles from './ProtectionPicker.module.css';
import { ButtonType } from '../../../ui/Button/ButtonType.ts';
import { ButtonVariant } from '../../../ui/Button/ButtonVariant.ts';
import { TextFieldType } from '../../../ui/TextField/TextFieldType.ts';

type Props = {
  submitLabel: string;
  busy: boolean;
  error: string | null;
  // The protection in use, when changing it from the settings.
  current?: ProtectionMode | null;
  onSubmit: (choice: ProtectionChoice) => void;
};

// Lets the user choose how the identity and contacts are protected on this device.
export const ProtectionPicker = ({ submitLabel, busy, error, current, onSubmit }: Props) => {
  const [passkey, setPasskey] = useState<boolean | null>(null);
  const [mode, setMode] = useState<ProtectionMode | null>(null);
  const [passphrase, setPassphrase] = useState(generatePassphrase);
  const [visible, setVisible] = useState(true);
  const selected = mode ?? (passkey === false ? ProtectionMode.Passphrase : ProtectionMode.Passkey);
  const weak = estimateBits(passphrase) < WEAK_BITS;

  useEffect(() => {
    void isPasskeySupported().then(setPasskey);
  }, []);

  const submit = (e: FormEvent) => {
    e.preventDefault();

    onSubmit(selected === ProtectionMode.Passphrase
      ? { mode: ProtectionMode.Passphrase, passphrase }
      : { mode: selected });
  };

  return (
    <form className={styles.picker} onSubmit={submit}>
      {OPTIONS.map(option => (
        <label
          key={option.mode}
          className={cx(styles.option, selected === option.mode && styles.selected)}
        >
          <input
            type="radio"
            name="protection"
            value={option.mode}
            checked={selected === option.mode}
            disabled={option.mode === ProtectionMode.Passkey && passkey === false}
            onChange={() => setMode(option.mode)}
          />
          <span className={styles.text}>
            <b>
              {option.title}
              {current === option.mode && ' · current'}
            </b>
            <span>{option.text}</span>
            {option.mode === ProtectionMode.Passkey && passkey === false && (
              <span className={styles.warn}>This browser can&apos;t encrypt with passkeys.</span>
            )}
            {option.mode === ProtectionMode.Device && selected === ProtectionMode.Device && (
              <span className={styles.warn}>Not recommended.</span>
            )}
          </span>
        </label>
      ))}

      {selected === ProtectionMode.Passphrase && (
        <TextField
          label="Passphrase"
          type={visible ? TextFieldType.Text : TextFieldType.Password}
          value={passphrase}
          onChange={setPassphrase}
          hint={weak
            ? <span className={styles.warn}>This passphrase looks weak. Use 5 or more random words.</span>
            : 'Write it down somewhere safe. If you forget it, the identity can\'t be recovered.'}
          action={(
            <>
              <Button variant={ButtonVariant.Secondary} onClick={() => setVisible(!visible)}>
                {visible ? 'Hide' : 'Show'}
              </Button>
              <Button variant={ButtonVariant.Secondary} onClick={() => setPassphrase(generatePassphrase())}>New</Button>
            </>
          )}
        />
      )}

      <p className={styles.note}>
        Losing a passkey that isn&apos;t synced, or forgetting the passphrase, means a new identity: your contacts
        will have to add and verify you again. While the app is unlocked, malware on this device could still misuse
        it; no app can prevent that.
      </p>

      {error && <p className={styles.error}>{error}</p>}

      <Button
        type={ButtonType.Submit}
        wide
        disabled={busy || (selected === ProtectionMode.Passphrase && !passphrase.trim())}
      >
        {busy ? 'Please wait…' : submitLabel}
      </Button>
    </form>
  );
};
