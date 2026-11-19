import { useRef, useState, type ChangeEvent, type ClipboardEvent, type FormEvent } from 'react';
import { sendFiles } from '../../store/thunks/sendFiles.ts';
import { sendMessage } from '../../store/thunks/sendMessage.ts';
import { useAppDispatch } from '../../store/useAppDispatch.ts';
import { useAppSelector } from '../../store/useAppSelector.ts';
import { IconButton } from '../IconButton/IconButton.tsx';
import styles from './Composer.module.css';

export const Composer = () => {
  const dispatch = useAppDispatch();
  const connected = useAppSelector(state => state.connection.status === 'connected');
  const [text, setText] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const submit = (e: FormEvent) => {
    e.preventDefault();

    if (dispatch(sendMessage(text))) {
      setText('');
    }
  };

  const pickFiles = (e: ChangeEvent<HTMLInputElement>) => {
    dispatch(sendFiles(Array.from(e.target.files ?? [])));
    e.target.value = '';
  };

  // Pasting an image (e.g. a screenshot) sends it as a file.
  const paste = (e: ClipboardEvent) => {
    const files = Array.from(e.clipboardData.files);

    if (files.length) {
      e.preventDefault();
      dispatch(sendFiles(files));
    }
  };

  return (
    <form className={styles.composer} onSubmit={submit}>
      <input ref={fileInputRef} type="file" multiple hidden onChange={pickFiles} />
      <IconButton
        icon="paperclip"
        label="Attach files"
        disabled={!connected}
        onClick={() => fileInputRef.current?.click()}
      />
      <input
        className={styles.input}
        type="text"
        value={text}
        placeholder="Type a message…"
        autoComplete="off"
        autoFocus
        disabled={!connected}
        onChange={e => setText(e.target.value)}
        onPaste={paste}
      />
      <button className={styles.send} type="submit" disabled={!connected || !text.trim()}>Send</button>
    </form>
  );
};
