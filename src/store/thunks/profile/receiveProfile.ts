import { infoHash } from '../../../core/profile/infoHash.ts';
import { isAbout } from '../../../core/profile/isAbout.ts';
import { isPhone } from '../../../core/profile/isPhone.ts';
import { isPicture } from '../../../core/profile/isPicture.ts';
import { profileHash } from '../../../core/profile/profileHash.ts';
import type { ProfileInfo } from '../../../core/profile/types.ts';
import { sendControl } from '../../../core/webrtc/sendControl.ts';
import { sessions } from '../../../core/webrtc/state.ts';
import { type ProfileSignal, ControlType } from '../../../core/webrtc/types.ts';
import { infoReceived, pictureReceived } from '../../contacts/contactsSlice.ts';
import type { AppThunk } from '../../store.ts';
import { profileHashes } from './profileHashes.ts';

const NO_INFO: ProfileInfo = { phone: '', about: '' };

// A phone and description as a contact may send them: both checked, an empty phone allowed.
const validInfo = (info: unknown): info is ProfileInfo => {
  const value = info as Partial<ProfileInfo> | null;

  return typeof value === 'object' && value !== null
    && (value.phone === '' || isPhone(value.phone)) && isAbout(value.about);
};

// A contact's profile hashes, with the parts we asked for; or their asking for parts of ours (see ProfileSignal).
// Only contacts take part.
export const receiveProfile = (id: string, signal: ProfileSignal): AppThunk<Promise<void>> => async (
  dispatch,
  getState,
) => {
  const contact = getState().contacts.list.find(c => c.id === id);

  const log = (text: string) => sessions.get(id)?.log(text);

  if (!contact) {
    return;
  }

  if (signal.t === ControlType.ProfileAsk) {
    const { profile } = getState();
    const ours = await profileHashes(profile);
    // A part that changed since they asked isn't sent: they have its new hash already and will ask again.
    const picture = profile.picture && signal.pictureHash === ours.pictureHash ? profile.picture : undefined;
    const info = ours.infoHash && signal.infoHash === ours.infoHash
      ? { phone: profile.phone, about: profile.about }
      : undefined;

    if (picture || info) {
      sendControl(id, { t: ControlType.Profile, ...ours, ...(picture ? { picture } : {}), ...(info ? { info } : {}) });
    }

    return;
  }

  if (typeof signal.pictureHash !== 'string' || typeof signal.infoHash !== 'string') {
    return;
  }

  const ask: { pictureHash?: string; infoHash?: string } = {};

  if (!signal.pictureHash) {
    if (contact.picture) {
      log('They removed their picture');
      dispatch(pictureReceived({ id, picture: null }));
    }
  } else if (signal.picture !== undefined) {
    if (isPicture(signal.picture) && signal.pictureHash === await profileHash(signal.picture)) {
      log('They sent a new picture');
      dispatch(pictureReceived({ id, picture: signal.picture }));
    }
  } else if (signal.pictureHash !== await profileHash(contact.picture)) {
    ask.pictureHash = signal.pictureHash;
  }

  const theirs = { phone: contact.phone ?? '', about: contact.about ?? '' };

  if (!signal.infoHash) {
    if (theirs.phone || theirs.about) {
      log('They removed their phone number and description');
      dispatch(infoReceived({ id, info: NO_INFO }));
    }
  } else if (signal.info !== undefined) {
    if (validInfo(signal.info) && signal.infoHash === await infoHash(signal.info)) {
      log('They sent a new phone number or description');
      dispatch(infoReceived({ id, info: { phone: signal.info.phone, about: signal.info.about } }));
    }
  } else if (signal.infoHash !== await infoHash(theirs)) {
    ask.infoHash = signal.infoHash;
  }

  if (ask.pictureHash || ask.infoHash) {
    sendControl(id, { t: ControlType.ProfileAsk, ...ask });
  }
};
