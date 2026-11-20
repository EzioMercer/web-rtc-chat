import { useEffect, useState } from 'react';
import { inviteError } from '../../store/invites/invitesSlice.ts';
import { useAppDispatch } from '../../store/useAppDispatch.ts';
import { useAppSelector } from '../../store/useAppSelector.ts';
import { cx } from '../../utils/cx.ts';
import { Dialog } from '../Dialog/Dialog.tsx';
import styles from './AddContactDialog.module.css';
import { InviteTab } from './InviteTab.tsx';
import { JoinTab } from './JoinTab.tsx';

type Props = {
  onClose: () => void;
};

export const AddContactDialog = ({ onClose }: Props) => {
  const dispatch = useAppDispatch();
  const [tab, setTab] = useState<'invite' | 'join'>('invite');
  // Someone used our invite, or we opened theirs: the naming dialog takes over, so this one closes.
  const handedOver = useAppSelector(state => state.invites.requests.length > 0 || state.invites.received !== null);

  const close = () => {
    dispatch(inviteError(null));
    onClose();
  };

  useEffect(() => {
    if (handedOver) {
      onClose();
    }
  }, [handedOver, onClose]);

  return (
    <Dialog title="Add contact" onClose={close}>
      <div className={styles.tabs} role="tablist">
        <button
          className={cx(styles.tab, tab === 'invite' && styles.active)}
          type="button"
          role="tab"
          aria-selected={tab === 'invite'}
          onClick={() => setTab('invite')}
        >
          Show my invite
        </button>
        <button
          className={cx(styles.tab, tab === 'join' && styles.active)}
          type="button"
          role="tab"
          aria-selected={tab === 'join'}
          onClick={() => setTab('join')}
        >
          I have an invite
        </button>
      </div>
      {tab === 'invite' ? <InviteTab /> : <JoinTab onOpened={close} />}
    </Dialog>
  );
};
