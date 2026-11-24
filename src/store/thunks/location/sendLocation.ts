import { nanoid } from '@reduxjs/toolkit';
import { MANUAL_KEY } from '../../../core/webrtc/config.ts';
import { sendControl } from '../../../core/webrtc/sendControl.ts';
import { locationAdded, messagesSent } from '../../chat/chatSlice.ts';
import { type GeoPoint, type LocationMessage, MessageAuthor, MessageKind } from '../../chat/types.ts';
import { ManualStatus } from '../../manual/types.ts';
import type { AppThunk } from '../../store.ts';
import { connectContact } from '../contact/connectContact.ts';
import { takeReply } from '../chat/takeReply.ts';
import { locationSignal } from './locationSignal.ts';

// Adds our location to the conversation and sends it, like a text (see sendMessage): once, or live for `liveFor`
// ms. It answers the message chosen for a reply, if any (see takeReply). Returns its id, or null if it can't be sent.
export const sendLocation = (key: string, point: GeoPoint, liveFor?: number): AppThunk<string | null> => (
  dispatch,
  getState,
) => {
  if (key === MANUAL_KEY && getState().manual.status !== ManualStatus.Connected) {
    return null;
  }

  const now = Date.now();
  const replyTo = dispatch(takeReply(key));
  const message: LocationMessage = {
    kind: MessageKind.Location,
    id: nanoid(),
    from: MessageAuthor.Me,
    ...point,
    at: now,
    ...(liveFor === undefined ? {} : { liveUntil: now + liveFor, updatedAt: now, rev: 0 }),
    pending: true,
    ...(replyTo === undefined ? {} : { replyTo }),
  };

  dispatch(locationAdded({ key, message }));

  if (sendControl(key, locationSignal(message))) {
    dispatch(messagesSent({ key, ids: [message.id] }));
  } else if (key !== MANUAL_KEY) {
    void dispatch(connectContact(key));
  }

  return message.id;
};
