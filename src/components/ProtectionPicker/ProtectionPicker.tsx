import { useEffect, useState, type FormEvent } from 'react';
import { isPasskeySupported } from '../../identity/passkey/isPasskeySupported.ts';
import { estimateBits } from '../../identity/passphrase/estimateBits.ts';
import { generatePassphrase } from '../../identity/passphrase/generatePassphrase.ts';
import { WEAK_BITS } from '../../identity/passphrase/WEAK_BITS.ts';
import type { ProtectionChoice, ProtectionMode } from '../../identity/types.ts';
import { cx } from '../../utils/cx.ts';
import { Button } from '../Button/Button.tsx';
import { TextField } from '../TextField/TextField.tsx';
import { OPTIONS } from './OPTIONS.ts';
import styles from './ProtectionPicker.module.css';

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
  const selected = mode ?? (passkey === false ? 'passphrase' : 'passkey');
  const weak = estimateBits(passphrase) < WEAK_BITS;

  useEffect(() => {
    void isPasskeySupported().then(setPasskey);
  }, []);

  const submit = (e: FormEvent) => {
    e.preventDefault();

    onSubmit(selected === 'passphrase' ? { mode: 'passphrase', passphrase } : { mode: selected });
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
            disabled={option.mode === 'passkey' && passkey === false}
            onChange={() => setMode(option.mode)}
          />
          <span className={styles.text}>
            <b>
              {option.title}
              {current === option.mode && ' · current'}
            </b>
            <span>{option.text}</span>
            {option.mode === 'passkey' && passkey === false && (
              <span className={styles.warn}>This browser can&apos;t encrypt with passkeys.</span>
            )}
            {option.mode === 'device' && selected === 'device' && (
              <span className={styles.warn}>Not recommended.</span>
            )}
          </span>
        </label>
      ))}

      {selected === 'passphrase' && (
        <TextField
          label="Passphrase"
          type={visible ? 'text' : 'password'}
          value={passphrase}
          onChange={setPassphrase}
          hint={weak
            ? <span className={styles.warn}>This passphrase looks weak. Use 5 or more random words.</span>
            : 'Write it down somewhere safe. If you forget it, the identity can\'t be recovered.'}
          action={(
            <>
              <Button variant="secondary" onClick={() => setVisible(!visible)}>{visible ? 'Hide' : 'Show'}</Button>
              <Button variant="secondary" onClick={() => setPassphrase(generatePassphrase())}>New</Button>
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

      <Button type="submit" wide disabled={busy || (selected === 'passphrase' && !passphrase.trim())}>
        {busy ? 'Please wait…' : submitLabel}
      </Button>
    </form>
  );
};
