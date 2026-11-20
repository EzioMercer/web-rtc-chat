import { nanoid } from '@reduxjs/toolkit';
import { MANUAL_KEY } from '../../../webrtc/config.ts';
import { sendControl } from '../../../webrtc/sendControl.ts';
import { messageQueued } from '../../chat/chatSlice.ts';
import type { AppThunk } from '../../store.ts';
import { connectContact } from '../contact/connectContact.ts';

// Adds `text` to the conversation and sends it over the direct connection. It stays "pending" until the other
// side confirms it; without a connection it goes out as soon as one opens (see sendPending). Returns whether it
// was taken.
export const sendMessage = (key: string, text: string): AppThunk<boolean> => (dispatch, getState) => {
  const trimmed = text.trim();
  const id = nanoid();

  // The manual connection can't come back, so it only sends while connected.
  if (!trimmed || (key === MANUAL_KEY && getState().manual.status !== 'connected')) {
    return false;
  }

  dispatch(messageQueued({ key, id, text: trimmed }));

  if (!sendControl(key, { t: 'text', text: trimmed, id }) && key !== MANUAL_KEY) {
    void dispatch(connectContact(key));
  }

  return true;
};
