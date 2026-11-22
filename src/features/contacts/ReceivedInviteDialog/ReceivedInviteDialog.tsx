import { useState } from 'react';
import { receivedInviteDone } from '../../../store/invites/invitesSlice.ts';
import { acceptReceivedInvite } from '../../../store/thunks/invite/acceptReceivedInvite.ts';
import { useAppDispatch } from '../../../store/useAppDispatch.ts';
import { useAppSelector } from '../../../store/useAppSelector.ts';
import { ContactNameForm } from '../ContactNameForm/ContactNameForm.tsx';
import { Dialog } from '../../../ui/Dialog/Dialog.tsx';

// We opened someone's invite: name them and send the request.
export const ReceivedInviteDialog = () => {
  const dispatch = useAppDispatch();
  const { received, error } = useAppSelector(state => state.invites);
  const [busy, setBusy] = useState(false);

  if (!received) {
    return null;
  }

  const close = () => dispatch(receivedInviteDone());

  const submit = async (name: string, replaceId: string | null) => {
    setBusy(true);
    await dispatch(acceptReceivedInvite(name, replaceId));
    setBusy(false);
  };

  return (
    <Dialog title="Add contact" onClose={close}>
      <ContactNameForm submitLabel="Add contact" busy={busy} error={error} onSubmit={submit} onCancel={close}>
        <p>
          You opened an invite. Name this contact; they will be asked to accept you, and then you can compare the
          safety code.
        </p>
      </ContactNameForm>
    </Dialog>
  );
};
