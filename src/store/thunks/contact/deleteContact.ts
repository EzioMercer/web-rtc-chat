import { closeSession } from '../../../core/webrtc/closeSession.ts';
import { sessions } from '../../../core/webrtc/state.ts';
import { contactDeleted } from '../../contacts/contactsSlice.ts';
import { sessionStatusChanged } from '../../sessions/sessionsSlice.ts';
import type { AppThunk } from '../../store.ts';
import { conversationSelected } from '../../ui/uiSlice.ts';
import { endCall } from '../call/endCall.ts';
import { clearConversation } from '../chat/clearConversation.ts';
import { SessionStatus } from '../../sessions/types.ts';

export const deleteContact = (id: string): AppThunk => (dispatch, getState) => {
  const session = sessions.get(id);

  if (getState().call.key === id) {
    dispatch(endCall('Call ended.'));
  }

  if (session) {
    closeSession(session);
  }

  if (getState().ui.selected === id) {
    dispatch(conversationSelected(null));
  }

  dispatch(sessionStatusChanged({ key: id, status: SessionStatus.Idle }));
  dispatch(clearConversation(id));
  dispatch(contactDeleted(id));
};
