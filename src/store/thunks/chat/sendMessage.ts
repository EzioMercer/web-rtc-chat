import { nanoid } from '@reduxjs/toolkit';
import { MANUAL_KEY } from '../../../core/webrtc/config.ts';
import { sendControl } from '../../../core/webrtc/sendControl.ts';
import { messageQueued, messagesSent } from '../../chat/chatSlice.ts';
import type { AppThunk } from '../../store.ts';
import { connectContact } from '../contact/connectContact.ts';
import { ManualStatus } from '../../manual/types.ts';
import { ControlType } from '../../../core/webrtc/types.ts';
import { replyField } from '../../chat/replyField.ts';
import { takeReply } from './takeReply.ts';

// Adds `text` to the conversation and sends it over the direct connection. It stays "pending" until the other
// side confirms it; without a connection it goes out as soon as one opens (see sendPending). Returns whether it
// was taken. It answers the message chosen for a reply, if any (see takeReply).
export const sendMessage = (key: string, text: string): AppThunk<boolean> => (dispatch, getState) => {
  const trimmed = text.trim();
  const id = nanoid();

  // The manual connection can't come back, so it only sends while connected.
  if (!trimmed || (key === MANUAL_KEY && getState().manual.status !== ManualStatus.Connected)) {
    return false;
  }

  const replyTo = dispatch(takeReply(key));

  dispatch(messageQueued({ key, id, text: trimmed, replyTo }));

  if (sendControl(key, { t: ControlType.Text, text: trimmed, id, ...replyField({ replyTo }) })) {
    dispatch(messagesSent({ key, ids: [id] }));
  } else if (key !== MANUAL_KEY) {
    void dispatch(connectContact(key));
  }

  return true;
};
