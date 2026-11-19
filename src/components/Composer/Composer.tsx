import { useState, type FormEvent } from 'react';
import { sendMessage } from '../../store/thunks/sendMessage.ts';
import { useAppDispatch } from '../../store/useAppDispatch.ts';
import { useAppSelector } from '../../store/useAppSelector.ts';
import styles from './Composer.module.css';

export const Composer = () => {
  const dispatch = useAppDispatch();
  const connected = useAppSelector(state => state.connection.status === 'connected');
  const [text, setText] = useState('');

  const submit = (e: FormEvent) => {
    e.preventDefault();

    if (dispatch(sendMessage(text))) {
      setText('');
    }
  };

  return (
    <form className={styles.composer} onSubmit={submit}>
      <input
        className={styles.input}
        type="text"
        value={text}
        placeholder="Type a message…"
        autoComplete="off"
        autoFocus
        disabled={!connected}
        onChange={e => setText(e.target.value)}
      />
      <button className={styles.send} type="submit" disabled={!connected || !text.trim()}>Send</button>
    </form>
  );
};
