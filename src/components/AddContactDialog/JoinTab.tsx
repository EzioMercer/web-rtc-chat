import { useCallback, useState } from 'react';
import { openInvite } from '../../store/thunks/invite/openInvite.ts';
import { useAppDispatch } from '../../store/useAppDispatch.ts';
import { useAppSelector } from '../../store/useAppSelector.ts';
import { Button } from '../Button/Button.tsx';
import { QrScanner } from '../QrScanner/QrScanner.tsx';
import { TextField } from '../TextField/TextField.tsx';
import styles from './AddContactDialog.module.css';

type Props = {
  onOpened: () => void;
};

// Opens an invite someone gave us: scan their QR code or paste their link.
export const JoinTab = ({ onOpened }: Props) => {
  const dispatch = useAppDispatch();
  const error = useAppSelector(state => state.invites.error);
  const [scanning, setScanning] = useState(false);
  const [link, setLink] = useState('');

  const open = useCallback((text: string) => {
    if (dispatch(openInvite(text))) {
      onOpened();
    } else {
      setScanning(false);
    }
  }, [dispatch, onOpened]);

  return (
    <>
      {scanning
        ? <QrScanner onResult={open} />
        : <Button variant="secondary" onClick={() => setScanning(true)}>Scan their QR code</Button>}
      <form
        className={styles.form}
        onSubmit={(e) => {
          e.preventDefault();
          open(link);
        }}
      >
        <TextField label="Or paste their invite link" value={link} placeholder="https://…#invite=…" onChange={setLink} />
        <Button type="submit" disabled={!link.trim()}>Open invite</Button>
      </form>
      {error && <p className={styles.error}>{error}</p>}
    </>
  );
};
