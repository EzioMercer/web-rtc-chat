import { useRef, useState, type ChangeEvent, type ClipboardEvent, type FormEvent } from 'react';
import { sendFiles } from '../../store/thunks/chat/sendFiles.ts';
import { sendMessage } from '../../store/thunks/chat/sendMessage.ts';
import { useAppDispatch } from '../../store/useAppDispatch.ts';
import { MANUAL_KEY } from '../../webrtc/config.ts';
import { IconButton } from '../IconButton/IconButton.tsx';
import { hasKeyboard } from '../../utils/hasKeyboard.ts';
import styles from './Composer.module.css';

type Props = {
  convKey: string;
  connected: boolean;
};

export const Composer = ({ convKey, connected }: Props) => {
  const dispatch = useAppDispatch();
  const [text, setText] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  // A contact's messages wait while offline and go out when the connection opens; files need the connection.
  const canType = connected || convKey !== MANUAL_KEY;

  const submit = (e: FormEvent) => {
    e.preventDefault();

    if (dispatch(sendMessage(convKey, text))) {
      setText('');
    }
  };

  const pickFiles = (e: ChangeEvent<HTMLInputElement>) => {
    dispatch(sendFiles(convKey, Array.from(e.target.files ?? [])));
    e.target.value = '';
  };

  // Pasting an image (e.g. a screenshot) sends it as a file.
  const paste = (e: ClipboardEvent) => {
    const files = Array.from(e.clipboardData.files);

    if (files.length) {
      e.preventDefault();
      dispatch(sendFiles(convKey, files));
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
        placeholder={connected ? 'Type a message…' : (canType ? 'Offline: sent when they\'re online' : 'Not connected')}
        autoComplete="off"
        autoFocus={hasKeyboard()}
        disabled={!canType}
        onChange={e => setText(e.target.value)}
        onPaste={paste}
      />
      <button className={styles.send} type="submit" disabled={!canType || !text.trim()}>Send</button>
    </form>
  );
};
