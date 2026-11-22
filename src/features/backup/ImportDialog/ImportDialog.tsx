import { useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import { BACKUP_SPEED } from '../../../core/backup/BACKUP_SPEED.ts';
import { openBackup } from '../../../core/backup/openBackup.ts';
import { readBackupPreview } from '../../../core/backup/readBackupPreview.ts';
import type { RestorePlan } from '../../../core/backup/restoreBackup.ts';
import { type ProtectionChoice, ProtectionMode } from '../../../core/identity/types.ts';
import type { Contact } from '../../../store/contacts/types.ts';
import { errorMessage } from '../../../store/thunks/app/errorMessage.ts';
import { importBackup } from '../../../store/thunks/backup/importBackup.ts';
import { openRestored } from '../../../store/thunks/backup/openRestored.ts';
import { useAppDispatch } from '../../../store/useAppDispatch.ts';
import { useAppSelector } from '../../../store/useAppSelector.ts';
import { Button } from '../../../ui/Button/Button.tsx';
import { Checkbox } from '../../../ui/Checkbox/Checkbox.tsx';
import { Dialog } from '../../../ui/Dialog/Dialog.tsx';
import { SegmentedControl } from '../../../ui/SegmentedControl/SegmentedControl.tsx';
import { TextField } from '../../../ui/TextField/TextField.tsx';
import { formatBytes } from '../../../utils/formatBytes.ts';
import { formatWait } from '../../../utils/formatWait.ts';
import { ProtectionPicker } from '../../setup/ProtectionPicker/ProtectionPicker.tsx';
import styles from '../backup.module.css';
import { ButtonType } from '../../../ui/Button/ButtonType.ts';
import { ButtonVariant } from '../../../ui/Button/ButtonVariant.ts';
import { CallStatus } from '../../../store/call/types.ts';
import { TextFieldType } from '../../../ui/TextField/TextFieldType.ts';

type Props = {
  // On the setup screen: the backup becomes a new identity, protected as chosen here.
  fresh: boolean;
  onClose: () => void;
};

type Preview = Awaited<ReturnType<typeof readBackupPreview>>;

// What to do when a chat from the backup has the same name as a different contact on this device.
enum Clash {
  KeepDevice,
  KeepBackup,
  KeepBoth,
}

const CLASH_OPTIONS = [
  { value: Clash.KeepDevice, label: 'This device\'s' },
  { value: Clash.KeepBackup, label: 'Backup\'s' },
  { value: Clash.KeepBoth, label: 'Both' },
];

// Above this, a temporary identity is warned that everything restored has to fit in memory.
const MEMORY_WARNING_BYTES = 500 * 1024 * 1024;

const NONE: Contact[] = [];

const sameName = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

// Restores a backup file: choose the file, open it with its password, choose which chats (and whether with media),
// and answer for chats whose name is already taken here. Chats from the backup replace the same chats here; other
// chats on this device stay.
export const ImportDialog = ({ fresh, onClose }: Props) => {
  const dispatch = useAppDispatch();
  const contacts = useAppSelector(state => state.contacts.list);
  const device = fresh ? NONE : contacts;
  const temporary = useAppSelector(state => state.app.mode === ProtectionMode.Temporary);
  const inCall = useAppSelector(state => state.call.status !== CallStatus.Idle);
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [password, setPassword] = useState('');
  const [preview, setPreview] = useState<Preview | null>(null);
  const [skipped, setSkipped] = useState<Set<string>>(new Set());
  const [media, setMedia] = useState(true);
  const [answers, setAnswers] = useState<Record<string, Clash>>({});
  const [sameForAll, setSameForAll] = useState(true);
  const [allAnswer, setAllAnswer] = useState(Clash.KeepBoth);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Restored; on the setup screen, with this protection.
  const [done, setDone] = useState<{ mode: ProtectionMode | null } | null>(null);

  const pick = async (e: ChangeEvent<HTMLInputElement>) => {
    const picked = e.target.files?.[0] ?? null;

    e.target.value = '';
    setError(null);

    if (!picked) {
      return;
    }

    try {
      (await openBackup(picked)).reader.cancel();
      setFile(picked);
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  const open = async (e: FormEvent) => {
    e.preventDefault();

    if (!file) {
      return;
    }

    setBusy(true);
    setError(null);

    try {
      setPreview(await readBackupPreview(file, password));
    } catch (err) {
      setError(errorMessage(err));
    }

    setBusy(false);
  };

  const chats = preview?.info.chats ?? [];
  const included = chats.filter(chat => !skipped.has(chat.id));
  const clashes = included.flatMap((chat) => {
    const other = device.find(contact => contact.id !== chat.id && sameName(contact.name, chat.name));

    return other ? [{ chat, other }] : [];
  });

  // One answer for all clashes (also when there is only one), or one per chat.
  const oneAnswer = sameForAll || clashes.length === 1;

  const answerFor = (id: string) => (oneAnswer ? allAnswer : answers[id] ?? Clash.KeepBoth);

  const hasMedia = chats.some(chat => chat.media && chat.mediaBytes > 0);
  const mediaBytes = included.reduce((sum, chat) => sum + (media ? chat.mediaBytes : 0), 0);

  const toggle = (id: string, include: boolean) => setSkipped((current) => {
    const next = new Set(current);

    if (include) {
      next.delete(id);
    } else {
      next.add(id);
    }

    return next;
  });

  const restore = async (choice: ProtectionChoice | null) => {
    if (!file || !preview) {
      return;
    }

    if (inCall && !window.confirm('Restoring ends your call and connections. Continue?')) {
      return;
    }

    const plan: RestorePlan = {
      include: new Set(included.map(chat => chat.id).filter(id => !clashes.some(
        clash => clash.chat.id === id && answerFor(id) === Clash.KeepDevice,
      ))),
      media,
      remove: new Set(clashes.filter(clash => answerFor(clash.chat.id) === Clash.KeepBackup).map(c => c.other.id)),
    };

    setBusy(true);
    setError(null);

    const failed = await dispatch(importBackup(file, preview.key, plan, choice));

    setBusy(false);

    if (failed) {
      setError(failed);
    } else {
      setDone({ mode: choice?.mode ?? null });
    }
  };

  // A new identity opens only now (the setup screen and this dialog go away with it).
  const finish = () => {
    if (done?.mode !== null && done?.mode !== undefined) {
      dispatch(openRestored(done.mode));
    } else {
      onClose();
    }
  };

  const chooseFile = (
    <>
      <p className={styles.text}>
        Choose a backup file (.p2pchat).
        {fresh
          ? ' Its chats and contacts become your identity on this device.'
          : ' Its chats are added here; a chat that is already here is replaced by the backup\'s.'}
      </p>
      <input ref={inputRef} type="file" hidden onChange={e => void pick(e)} />
      <Button variant={ButtonVariant.Secondary} onClick={() => inputRef.current?.click()}>
        {file ? 'Choose another file' : 'Choose file'}
      </Button>
      {file && <p className={styles.muted}>{`${file.name} · ${formatBytes(file.size)}`}</p>}
    </>
  );

  const body = () => {
    if (done) {
      return (
        <>
          <p className={styles.text}>The backup is restored.</p>
          <p className={styles.notice}>
            <b>Use one device at a time.</b>
            {' '}
            The device the backup came from has the same keys: if both are open, both answer your contacts and the
            chats split between them.
          </p>
          <Button wide onClick={finish}>Done</Button>
        </>
      );
    }

    if (!preview) {
      return (
        <form className={styles.form} onSubmit={e => void open(e)}>
          {chooseFile}
          {file && (
            <TextField
              label="Backup password"
              type={TextFieldType.Password}
              value={password}
              autoFocus
              onChange={setPassword}
            />
          )}
          {error && <p className={styles.error}>{error}</p>}
          {file && (
            <Button type={ButtonType.Submit} wide disabled={busy || !password}>
              {busy ? 'Opening…' : 'Open'}
            </Button>
          )}
        </form>
      );
    }

    const wait = formatWait(2000 + (file?.size ?? 0) / BACKUP_SPEED);

    return (
      <>
        <p className={styles.text}>
          {`${chats.length} ${chats.length === 1 ? 'chat' : 'chats'} · ${formatBytes(file?.size ?? 0)} · ${wait}`}
        </p>
        <div className={styles.chats}>
          {chats.map(chat => (
            <div key={chat.id} className={styles.chat}>
              <span className={styles.chatName}>
                <Checkbox checked={!skipped.has(chat.id)} onChange={include => toggle(chat.id, include)}>
                  {chat.name}
                </Checkbox>
              </span>
              <span className={styles.chatSize}>
                {`${chat.messages} msg${chat.media && chat.mediaBytes ? ` · ${formatBytes(chat.mediaBytes)}` : ''}`}
              </span>
              {device.some(contact => contact.id === chat.id) && (
                <span className={styles.muted}>Replaces this chat on this device.</span>
              )}
            </div>
          ))}
        </div>
        {hasMedia && (
          <Checkbox checked={media} onChange={setMedia}>Restore files, voice and video messages</Checkbox>
        )}
        {clashes.length > 0 && (
          <div className={styles.question}>
            <p>
              {clashes.length === 1
                ? `You already have a different contact called "${clashes[0].chat.name}". Which one to keep?`
                : `${clashes.length} contacts in the backup have the names of different contacts here. Which to keep?`}
            </p>
            {clashes.length > 1 && (
              <Checkbox checked={sameForAll} onChange={setSameForAll}>Do the same for all</Checkbox>
            )}
            {oneAnswer
              ? <SegmentedControl options={CLASH_OPTIONS} value={allAnswer} wide onChange={setAllAnswer} />
              : clashes.map(({ chat }) => (
                  <div key={chat.id} className={styles.chat}>
                    <span className={styles.chatName}>{chat.name}</span>
                    <SegmentedControl
                      options={CLASH_OPTIONS}
                      value={answerFor(chat.id)}
                      onChange={value => setAnswers(current => ({ ...current, [chat.id]: value }))}
                    />
                  </div>
                ))}
          </div>
        )}
        {(temporary || fresh) && media && mediaBytes > MEMORY_WARNING_BYTES && (
          <p className={styles.notice}>
            {fresh ? 'With Temporary protection, everything' : 'This identity is temporary: everything'}
            {' restored has to fit in this tab\'s memory. With this much media it may not: choose fewer chats or '}
            leave media out.
          </p>
        )}
        {!fresh && (
          <p className={styles.notice}>
            <b>The app goes offline while restoring.</b>
            {' '}
            {inCall ? 'Your call ends and files' : 'Files'}
            {' on their way stop. Keep this tab open and the screen on.'}
          </p>
        )}
        {fresh
          ? (
              <>
                <p className={styles.text}>Choose how this device protects the restored identity:</p>
                <ProtectionPicker
                  submitLabel="Restore"
                  busy={busy}
                  error={error}
                  onSubmit={choice => void restore(choice)}
                />
              </>
            )
          : (
              <>
                {error && <p className={styles.error}>{error}</p>}
                <Button wide disabled={busy || !included.length} onClick={() => void restore(null)}>Restore</Button>
              </>
            )}
      </>
    );
  };

  return (
    <Dialog title="Restore a backup" onClose={onClose} dismissible={!busy}>
      <div className={styles.form}>{body()}</div>
    </Dialog>
  );
};
