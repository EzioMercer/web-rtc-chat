import { useEffect, useState } from 'react';
import { inviteError } from '../../../store/invites/invitesSlice.ts';
import { useAppDispatch } from '../../../store/useAppDispatch.ts';
import { useAppSelector } from '../../../store/useAppSelector.ts';
import { Dialog } from '../../../ui/Dialog/Dialog.tsx';
import { SegmentedControl } from '../../../ui/SegmentedControl/SegmentedControl.tsx';
import { InviteTab } from './InviteTab.tsx';
import { JoinTab } from './JoinTab.tsx';

type Props = {
  onClose: () => void;
};

type Tab = 'invite' | 'join';

const TABS: { value: Tab; label: string }[] = [
  { value: 'invite', label: 'Show my invite' },
  { value: 'join', label: 'I have an invite' },
];

export const AddContactDialog = ({ onClose }: Props) => {
  const dispatch = useAppDispatch();
  const [tab, setTab] = useState<Tab>('invite');
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
      <SegmentedControl
        kind="tabs"
        wide
        options={TABS}
        value={tab}
        onChange={setTab}
      />
      {tab === 'invite' ? <InviteTab /> : <JoinTab onOpened={close} />}
    </Dialog>
  );
};
