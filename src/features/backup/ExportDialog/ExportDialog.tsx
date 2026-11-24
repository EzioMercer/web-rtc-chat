import { useEffect, useState } from 'react';
import { measureBackup } from '../../../core/backup/measureBackup.ts';
import { ProtectionMode } from '../../../core/identity/types.ts';
import { MessageKind } from '../../../store/chat/types.ts';
import { MANUAL_KEY } from '../../../core/webrtc/config.ts';
import { exportBackup } from '../../../store/thunks/backup/exportBackup.ts';
import { useAppDispatch } from '../../../store/useAppDispatch.ts';
import { useAppSelector } from '../../../store/useAppSelector.ts';
import { Button } from '../../../ui/Button/Button.tsx';
import { Checkbox } from '../../../ui/Checkbox/Checkbox.tsx';
import { ConfirmDialog } from '../../../ui/ConfirmDialog/ConfirmDialog.tsx';
import { Dialog } from '../../../ui/Dialog/Dialog.tsx';
import { SegmentedControl } from '../../../ui/SegmentedControl/SegmentedControl.tsx';
import { formatBytes } from '../../../utils/formatBytes.ts';
import { formatWait } from '../../../utils/formatWait.ts';
import { ConfirmIdentity } from '../ConfirmIdentity/ConfirmIdentity.tsx';
import { NewPasswordFields } from '../NewPasswordFields/NewPasswordFields.tsx';
import styles from '../backup.module.css';
import { CallStatus } from '../../../store/call/types.ts';
import { ButtonVariant } from '../../../ui/Button/ButtonVariant.ts';
import { ManualStatus } from '../../../store/manual/types.ts';

type Props = {
  onClose: () => void;
  // Opened in place of Settings: back to it (also Cancel and Done).
  onBack?: () => void;
};

type Estimate = Awaited<ReturnType<typeof measureBackup>>;

type Choice = { include: boolean; media: boolean };

// Opening the file and making the password's key take about this long, whatever the size.
const START_MS = 2000;

const MEDIA_OPTIONS = [
  { value: 0, label: 'Text only' },
  { value: 1, label: 'Text and media' },
];

const CHAT_OPTIONS = [
  { value: 0, label: 'Text' },
  { value: 1, label: 'Media' },
];

// Chooses what goes into a backup and makes it: text only or with media (files, voice and video messages), for
// all chats or each on its own, and the password that locks the file.
export const ExportDialog = ({ onClose, onBack }: Props) => {
  const dispatch = useAppDispatch();
  const mode = useAppSelector(state => state.app.mode);
  const contacts = useAppSelector(state => state.contacts.list);
  const conversations = useAppSelector(state => state.chat.conversations);
  const inCall = useAppSelector(state => state.call.status !== CallStatus.Idle);
  const manual = useAppSelector(state => state.manual.status === ManualStatus.Connected);
  const [confirmed, setConfirmed] = useState(mode !== ProtectionMode.Passkey && mode !== ProtectionMode.Passphrase);
  const [estimate, setEstimate] = useState<Estimate | null>(null);
  const [media, setMedia] = useState(true);
  const [perChat, setPerChat] = useState(false);
  const [choices, setChoices] = useState<Record<string, Choice>>({});
  const [password, setPassword] = useState('');
  const [repeat, setRepeat] = useState('');
  const [busy, setBusy] = useState(false);
  // Asking first, when a call or connection would end.
  const [asking, setAsking] = useState(false);
  // undefined: not made yet; null: made; text: what went wrong.
  const [result, setResult] = useState<string | null | undefined>(undefined);

  useEffect(() => {
    const chats = Object.fromEntries(contacts.map(contact => [contact.id, conversations[contact.id] ?? []]));

    void measureBackup(chats).then(setEstimate);
    // Measured once, when the dialog opens: the app goes offline before the backup, so nothing changes meanwhile.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const choiceFor = (id: string): Choice => (perChat ? choices[id] : undefined) ?? { include: true, media };

  const chosen = contacts.filter(contact => choiceFor(contact.id).include);

  const sizeOf = (id: string, withMedia: boolean) => {
    const size = estimate?.sizes[id];

    return size ? size.text + (withMedia ? size.media : 0) : 0;
  };

  const workOf = (id: string, withMedia: boolean) => {
    const size = estimate?.sizes[id];

    return size ? size.work - (withMedia ? 0 : size.media) : 0;
  };

  const total = (pick: (id: string) => boolean | null) => {
    const ids = contacts.map(contact => contact.id).filter(id => pick(id) !== null);
    const bytes = ids.reduce((sum, id) => sum + sizeOf(id, Boolean(pick(id))), 0);
    const work = ids.reduce((sum, id) => sum + workOf(id, Boolean(pick(id))), 0);

    return `${formatBytes(bytes)} · ${formatWait(START_MS + work / (estimate?.speed ?? 1))}`;
  };

  const sizeLabel = (id: string, choice: Choice) => {
    if (!choice.include) {
      return '—';
    }

    const shown = conversations[id]?.some(message => message.kind !== MessageKind.Deleted);

    return shown ? formatBytes(sizeOf(id, choice.media)) : 'no messages';
  };

  // Changing the main choice applies it to every chat again.
  const chooseMedia = (value: boolean) => {
    setMedia(value);
    setChoices(current => Object.fromEntries(Object.entries(current).map(([id, c]) => [id, { ...c, media: value }])));
  };

  const setChoice = (id: string, change: Partial<Choice>) => {
    setChoices(current => ({ ...current, [id]: { ...choiceFor(id), ...current[id], ...change } }));
  };

  const start = async () => {
    setAsking(false);
    setBusy(true);
    setResult(await dispatch(exportBackup(
      chosen.map(contact => ({ id: contact.id, media: choiceFor(contact.id).media })),
      password,
    )));
    setBusy(false);
  };

  const body = () => {
    if (!confirmed) {
      return <ConfirmIdentity onConfirmed={() => setConfirmed(true)} />;
    }

    if (result === null) {
      return (
        <>
          <p className={styles.text}>
            The backup is being saved to your downloads. Keep it somewhere safe: with its password, it opens every
            chat in it.
          </p>
          <p className={styles.notice}>
            <b>Use one device at a time.</b>
            {' '}
            A restored backup has the same keys as this device: if both are open, both answer your contacts and the
            chats split between them.
          </p>
          <Button wide onClick={onBack ?? onClose}>Done</Button>
        </>
      );
    }

    return (
      <>
        <p className={styles.text}>
          Everything in the file is encrypted with a password you choose now. Settings stay on this device.
        </p>
        <SegmentedControl
          options={MEDIA_OPTIONS}
          value={media ? 1 : 0}
          wide
          onChange={value => chooseMedia(value === 1)}
        />
        <dl className={styles.sizes}>
          <dt>Text only</dt>
          <dd>{estimate ? total(() => false) : '…'}</dd>
          <dt>Text and media</dt>
          <dd>{estimate ? total(() => true) : '…'}</dd>
        </dl>
        <Checkbox checked={perChat} onChange={setPerChat}>Choose for each chat</Checkbox>
        {perChat && (
          <div className={styles.chats}>
            {contacts.map((contact) => {
              const choice = choiceFor(contact.id);

              return (
                <div key={contact.id} className={styles.chat}>
                  <span className={styles.chatName}>
                    <Checkbox checked={choice.include} onChange={include => setChoice(contact.id, { include })}>
                      {contact.name}
                    </Checkbox>
                  </span>
                  <SegmentedControl
                    options={CHAT_OPTIONS}
                    value={choice.media ? 1 : 0}
                    onChange={value => setChoice(contact.id, { media: value === 1 })}
                  />
                  <span className={styles.chatSize}>
                    {sizeLabel(contact.id, choice)}
                  </span>
                </div>
              );
            })}
          </div>
        )}
        {perChat && (
          <p className={styles.muted}>
            {`Chosen: ${total(id => (choiceFor(id).include ? choiceFor(id).media : null))}`}
          </p>
        )}
        <NewPasswordFields
          password={password}
          repeat={repeat}
          onChange={(next, again) => {
            setPassword(next);
            setRepeat(again);
          }}
        />
        <p className={styles.notice}>
          <b>The app goes offline while the backup is made.</b>
          {' '}
          {inCall ? 'Your call ends, files' : 'Files'}
          {' on their way stop and nothing new comes in until it is done. Keep this tab open and the screen on.'}
        </p>
        {result && <p className={styles.error}>{result}</p>}
        <Button
          wide
          disabled={busy || !estimate || !chosen.length || !password || password !== repeat}
          onClick={() => (inCall || manual ? setAsking(true) : void start())}
        >
          Make backup
        </Button>
        {!contacts.length && <p className={styles.muted}>There are no chats to back up yet.</p>}
        {conversations[MANUAL_KEY] && (
          <p className={styles.muted}>The manual connection&apos;s chat is never saved, so it isn&apos;t backed up.</p>
        )}
        <Button variant={ButtonVariant.Ghost} onClick={onBack ?? onClose}>Cancel</Button>
      </>
    );
  };

  return (
    <>
      <Dialog title="Back up chats" onClose={onClose} onBack={busy ? undefined : onBack} dismissible={!busy}>
        <div className={styles.form}>{body()}</div>
      </Dialog>
      {asking && (
        <ConfirmDialog
          title="End your call?"
          confirmLabel="Make backup"
          onConfirm={() => void start()}
          onCancel={() => setAsking(false)}
        >
          Making a backup ends your call and connections.
        </ConfirmDialog>
      )}
    </>
  );
};
