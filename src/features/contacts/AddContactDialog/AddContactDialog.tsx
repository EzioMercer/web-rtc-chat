import { useEffect, useState } from 'react';
import { inviteError } from '../../../store/invites/invitesSlice.ts';
import { useAppDispatch } from '../../../store/useAppDispatch.ts';
import { useAppSelector } from '../../../store/useAppSelector.ts';
import { Dialog } from '../../../ui/Dialog/Dialog.tsx';
import { SegmentedControl } from '../../../ui/SegmentedControl/SegmentedControl.tsx';
import { SegmentKind } from '../../../ui/SegmentedControl/SegmentKind.ts';
import { InviteTab } from './InviteTab.tsx';
import { JoinTab } from './JoinTab.tsx';

type Props = {
  onClose: () => void;
};

enum Tab {
  Invite,
  Join,
}

const TABS: { value: Tab; label: string }[] = [
  { value: Tab.Invite, label: 'Show my invite' },
  { value: Tab.Join, label: 'I have an invite' },
];

export const AddContactDialog = ({ onClose }: Props) => {
  const dispatch = useAppDispatch();
  const [tab, setTab] = useState(Tab.Invite);
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
        kind={SegmentKind.Tabs}
        wide
        options={TABS}
        value={tab}
        onChange={setTab}
      />
      {tab === Tab.Invite ? <InviteTab /> : <JoinTab onOpened={close} />}
    </Dialog>
  );
};
