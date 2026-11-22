import { requestDone } from '../../../store/invites/invitesSlice.ts';
import { acceptRequest } from '../../../store/thunks/invite/acceptRequest.ts';
import { useAppDispatch } from '../../../store/useAppDispatch.ts';
import { useAppSelector } from '../../../store/useAppSelector.ts';
import { ContactNameForm } from '../ContactNameForm/ContactNameForm.tsx';
import { Dialog } from '../../../ui/Dialog/Dialog.tsx';

// Someone used our invite: name and accept them, or reject.
export const RequestDialog = () => {
  const dispatch = useAppDispatch();
  const request = useAppSelector(state => state.invites.requests[0]);

  if (!request) {
    return null;
  }

  const reject = () => dispatch(requestDone(request.id));

  return (
    <Dialog title="Someone used your invite" onClose={reject}>
      <ContactNameForm
        key={request.id}
        submitLabel="Accept"
        cancelLabel="Reject"
        onSubmit={(name, replaceId) => void dispatch(acceptRequest(request.id, name, replaceId))}
        onCancel={reject}
      >
        <p>
          Only accept if you just gave someone your invite. After connecting, compare the safety code with them.
        </p>
      </ContactNameForm>
    </Dialog>
  );
};
