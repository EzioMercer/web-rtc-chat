import { useRef, useState, type ChangeEvent, type ClipboardEvent, type FormEvent } from 'react';
import { useRecording } from '../../recording/useRecording.ts';
import { sendFiles } from '../../../store/thunks/chat/sendFiles.ts';
import { sendMessage } from '../../../store/thunks/chat/sendMessage.ts';
import { useAppDispatch } from '../../../store/useAppDispatch.ts';
import { useAppSelector } from '../../../store/useAppSelector.ts';
import { hasKeyboard } from '../../../utils/hasKeyboard.ts';
import { MANUAL_KEY } from '../../../core/webrtc/config.ts';
import { LocationDialog } from '../../location/LocationDialog/LocationDialog.tsx';
import { AttachMenu } from '../AttachMenu/AttachMenu.tsx';
import { RecordButton } from '../../recording/RecordButton/RecordButton.tsx';
import { RecordingBar } from '../../recording/RecordingBar/RecordingBar.tsx';
import { VideoNotePreview } from '../../recording/VideoNotePreview/VideoNotePreview.tsx';
import styles from './Composer.module.css';
import { CallStatus } from '../../../store/call/types.ts';
import { RecordPhase } from '../../recording/RecordPhase.ts';

type Props = {
  convKey: string;
  connected: boolean;
};

export const Composer = ({ convKey, connected }: Props) => {
  const dispatch = useAppDispatch();
  const [text, setText] = useState('');
  // Which location window is open: a one-time place, or a live one.
  const [locating, setLocating] = useState<'once' | 'live' | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  // The microphone and camera are busy during a call.
  const inCall = useAppSelector(state => state.call.status !== CallStatus.Idle);
  const recording = useRecording(convKey);
  const { phase, recorder } = recording;
  // A contact's messages, files and recordings wait while offline and go out when the connection opens (see
  // sendPending); the manual connection can't come back, so there nothing waits.
  const canType = connected || convKey !== MANUAL_KEY;
  const offlineText = canType ? 'Offline: sent when they\'re online' : 'Not connected';
  // Like chat apps: the Send button while there's text, the record button otherwise.
  const showSend = text.trim() !== '' && phase === RecordPhase.Idle;

  const submit = (e: FormEvent) => {
    e.preventDefault();

    if (dispatch(sendMessage(convKey, text))) {
      setText('');
    }
  };

  const pickFiles = (e: ChangeEvent<HTMLInputElement>) => {
    void dispatch(sendFiles(convKey, Array.from(e.target.files ?? [])));
    e.target.value = '';
  };

  // Pasting an image (e.g. a screenshot) sends it as a file.
  const paste = (e: ClipboardEvent) => {
    const files = Array.from(e.clipboardData.files);

    if (files.length) {
      e.preventDefault();
      void dispatch(sendFiles(convKey, files));
    }
  };

  return (
    <form className={styles.composer} onSubmit={submit}>
      <input ref={fileInputRef} type="file" multiple hidden onChange={pickFiles} />
      <div className={styles.field}>
        <AttachMenu
          disabled={!canType}
          items={[
            { icon: 'file', label: 'Photo or file', onPick: () => fileInputRef.current?.click() },
            { icon: 'pin', label: 'Location', onPick: () => setLocating('once') },
            { icon: 'live', label: 'Live location', onPick: () => setLocating('live') },
          ]}
        />
        <input
          className={styles.input}
          type="text"
          value={text}
          placeholder={connected ? 'Type a message…' : offlineText}
          autoComplete="off"
          autoFocus={hasKeyboard()}
          disabled={!canType}
          onChange={e => setText(e.target.value)}
          onPaste={paste}
        />
        {phase !== RecordPhase.Idle && (
          <RecordingBar phase={phase} recorder={recorder} slideX={recording.slide.x} onCancel={recording.cancel} />
        )}
      </div>
      {showSend
        ? (
            <button
              className={styles.send}
              type="submit"
              disabled={!canType}
              // Keep the focus (and the phone keyboard) in the message field, like messaging apps do.
              onPointerDown={e => e.preventDefault()}
            >
              Send
            </button>
          )
        : (
            <RecordButton
              mode={recording.mode}
              phase={phase}
              recorder={recorder}
              slide={recording.slide}
              hint={recording.hint}
              disabled={phase === RecordPhase.Idle && (!canType || inCall)}
              handlers={recording.buttonProps}
            />
          )}
      {recorder?.video && <VideoNotePreview recorder={recorder} />}
      {locating && (
        <LocationDialog convKey={convKey} live={locating === 'live'} onClose={() => setLocating(null)} />
      )}
    </form>
  );
};
