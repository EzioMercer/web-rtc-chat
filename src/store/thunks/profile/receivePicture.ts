import { isPicture } from '../../../core/profile/isPicture.ts';
import { pictureHash } from '../../../core/profile/pictureHash.ts';
import { sendControl } from '../../../core/webrtc/sendControl.ts';
import { sessions } from '../../../core/webrtc/state.ts';
import { type PictureSignal, ControlType } from '../../../core/webrtc/types.ts';
import { pictureReceived } from '../../contacts/contactsSlice.ts';
import type { AppThunk } from '../../store.ts';

// A contact's picture, the hash of it, or their asking for ours (see PictureSignal). Only contacts take part.
export const receivePicture = (id: string, signal: PictureSignal): AppThunk<Promise<void>> => async (
  dispatch,
  getState,
) => {
  const contact = getState().contacts.list.find(c => c.id === id);

  if (!contact || typeof signal.hash !== 'string') {
    return;
  }

  if (signal.t === ControlType.PictureAsk) {
    const { picture } = getState().profile;

    // Our picture changed since they asked: they have the new hash already and will ask again.
    if (picture && signal.hash === await pictureHash(picture)) {
      sendControl(id, { t: ControlType.Picture, hash: signal.hash, picture });
    }

    return;
  }

  if (!signal.hash) {
    if (contact.picture) {
      sessions.get(id)?.log('They removed their picture');
      dispatch(pictureReceived({ id, picture: null }));
    }

    return;
  }

  if (signal.picture === undefined) {
    if (signal.hash !== await pictureHash(contact.picture)) {
      sendControl(id, { t: ControlType.PictureAsk, hash: signal.hash });
    }

    return;
  }

  if (isPicture(signal.picture) && signal.hash === await pictureHash(signal.picture)) {
    sessions.get(id)?.log('They sent a new picture');
    dispatch(pictureReceived({ id, picture: signal.picture }));
  }
};
