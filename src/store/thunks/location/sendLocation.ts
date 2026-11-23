import { nanoid } from '@reduxjs/toolkit';
import { MANUAL_KEY } from '../../../core/webrtc/config.ts';
import { sendControl } from '../../../core/webrtc/sendControl.ts';
import { locationAdded } from '../../chat/chatSlice.ts';
import { type GeoPoint, type LocationMessage, MessageAuthor, MessageKind } from '../../chat/types.ts';
import { ManualStatus } from '../../manual/types.ts';
import type { AppThunk } from '../../store.ts';
import { connectContact } from '../contact/connectContact.ts';
import { locationSignal } from './locationSignal.ts';

// Adds our location to the conversation and sends it, like a text (see sendMessage): once, or live for `liveFor`
// ms. Returns its id, or null if it can't be sent.
export const sendLocation = (key: string, point: GeoPoint, liveFor?: number): AppThunk<string | null> => (
  dispatch,
  getState,
) => {
  if (key === MANUAL_KEY && getState().manual.status !== ManualStatus.Connected) {
    return null;
  }

  const now = Date.now();
  const message: LocationMessage = {
    kind: MessageKind.Location,
    id: nanoid(),
    from: MessageAuthor.Me,
    ...point,
    at: now,
    ...(liveFor === undefined ? {} : { liveUntil: now + liveFor, updatedAt: now, rev: 0 }),
    pending: true,
  };

  dispatch(locationAdded({ key, message }));

  if (!sendControl(key, locationSignal(message)) && key !== MANUAL_KEY) {
    void dispatch(connectContact(key));
  }

  return message.id;
};
