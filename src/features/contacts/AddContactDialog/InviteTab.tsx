import { useEffect, useState } from 'react';
import { createInvite } from '../../../store/thunks/invite/createInvite.ts';
import { useAppDispatch } from '../../../store/useAppDispatch.ts';
import { useAppSelector } from '../../../store/useAppSelector.ts';
import { Button } from '../../../ui/Button/Button.tsx';
import { CopyButton } from '../../../ui/CopyButton/CopyButton.tsx';
import { QrCode } from '../../../ui/QrCode/QrCode.tsx';
import { formatRemaining } from './formatRemaining.ts';
import styles from './AddContactDialog.module.css';

// Shows our single-use invite as a QR code and a link.
export const InviteTab = () => {
  const dispatch = useAppDispatch();
  const mine = useAppSelector(state => state.invites.mine);
  const [now, setNow] = useState(Date.now);

  useEffect(() => {
    if (!mine) {
      void dispatch(createInvite());
    }
  }, [dispatch, mine]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);

    return () => window.clearInterval(timer);
  }, []);

  if (!mine) {
    return <p className={styles.muted}>Creating an invite…</p>;
  }

  const share = () => navigator.share?.({ title: 'P2P Chat invite', url: mine.link }).catch(() => undefined);

  return (
    <>
      <QrCode text={mine.link} />
      <p className={styles.muted}>
        <b>In person:</b>
        {' '}
        let your friend scan this code with their camera.
        <br />
        <b>Remotely:</b>
        {' '}
        send them the link, then compare the safety code on an in-app voice call.
      </p>
      <div className={styles.linkRow}>
        <input
          className={styles.link}
          value={mine.link}
          readOnly
          aria-label="Invite link"
          onFocus={e => e.target.select()}
        />
        <CopyButton text={mine.link} />
      </div>
      {'share' in navigator && <Button variant="secondary" onClick={share}>Share link</Button>}
      <p className={styles.muted}>
        {`Single use · expires in ${formatRemaining(mine.expiresAt - now)} · keep the app open until they use it.`}
      </p>
      <Button variant="ghost" onClick={() => void dispatch(createInvite())}>Make a new invite</Button>
    </>
  );
};
