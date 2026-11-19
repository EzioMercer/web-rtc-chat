import { useState } from 'react';
import { submitPeerCode } from '../../store/thunks/submitPeerCode.ts';
import { useAppDispatch } from '../../store/useAppDispatch.ts';
import { useAppSelector } from '../../store/useAppSelector.ts';
import { cx } from '../../utils/cx.ts';
import { getAction } from '../../utils/getAction.ts';
import { getHint } from '../../utils/getHint.ts';
import { CodeField } from '../CodeField/CodeField.tsx';
import { CopyButton } from '../CopyButton/CopyButton.tsx';
import styles from './Setup.module.css';

const PLACEHOLDERS = {
  none: 'Leave empty to host, or paste the code you received…',
  host: 'Paste the peer\'s reply code here…',
  client: '',
};

export const Setup = () => {
  const dispatch = useAppDispatch();
  const connection = useAppSelector(state => state.connection);
  const [peerCode, setPeerCode] = useState('');
  const action = getAction(connection, peerCode.trim() !== '');
  const { role, myCode, error } = connection;

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
        readOnly={role === 'client'}
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
    </section>
  );
};
