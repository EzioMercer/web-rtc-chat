import { useState } from 'react';
import { submitPeerCode } from '../../../store/thunks/manual/submitPeerCode.ts';
import { startOver } from '../../../store/thunks/manual/startOver.ts';
import { useAppDispatch } from '../../../store/useAppDispatch.ts';
import { useAppSelector } from '../../../store/useAppSelector.ts';
import { cx } from '../../../utils/cx.ts';
import { getAction } from '../getAction.ts';
import { getHint } from '../getHint.ts';
import { CodeField } from '../../../ui/CodeField/CodeField.tsx';
import { Button } from '../../../ui/Button/Button.tsx';
import { CopyButton } from '../../../ui/CopyButton/CopyButton.tsx';
import styles from './ManualSetup.module.css';
import { ManualRole } from '../../../store/manual/types.ts';
import { ButtonVariant } from '../../../ui/Button/ButtonVariant.ts';

const PLACEHOLDERS: Record<ManualRole, string> = {
  [ManualRole.None]: 'Leave empty to host, or paste the code you received…',
  [ManualRole.Host]: 'Paste the peer\'s reply code here…',
  [ManualRole.Client]: '',
};

// Connecting without contacts or relays: the two sides copy codes to each other by hand.
export const ManualSetup = () => {
  const dispatch = useAppDispatch();
  const connection = useAppSelector(state => state.manual);
  const [peerCode, setPeerCode] = useState('');
  const action = getAction(connection, peerCode.trim() !== '');
  const { role, myCode, error } = connection;
  const started = role !== ManualRole.None;

  return (
    <section className={styles.card}>
      <ol className={styles.steps}>
        <li>
          <b>To host:</b>
          {' '}
          leave the first field empty and press
          {' '}
          <i>Host</i>
          . Send your code to the peer, then paste their reply into the first field and press
          {' '}
          <i>Connect</i>
          .
        </li>
        <li>
          <b>To join:</b>
          {' '}
          paste the host&apos;s code into the first field and press
          {' '}
          <i>Join</i>
          . Send your code back to the host.
        </li>
      </ol>

      <CodeField
        label="Peer's code"
        value={peerCode}
        placeholder={PLACEHOLDERS[role]}
        readOnly={role === ManualRole.Client}
        onChange={setPeerCode}
      />

      <button
        className={styles.action}
        type="button"
        disabled={action.disabled}
        onClick={() => dispatch(submitPeerCode(peerCode))}
      >
        {action.label}
      </button>

      <CodeField
        label="Your code"
        value={myCode}
        placeholder="Your code will appear here…"
        readOnly
        action={<CopyButton text={myCode} />}
      />

      <p className={cx(styles.hint, error && styles.error)}>{error ?? getHint(connection)}</p>

      {started && <Button variant={ButtonVariant.Ghost} onClick={() => dispatch(startOver())}>Start over</Button>}
    </section>
  );
};
