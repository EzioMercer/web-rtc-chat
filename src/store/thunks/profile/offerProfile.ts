import { sendControl } from '../../../core/webrtc/sendControl.ts';
import { ControlType } from '../../../core/webrtc/types.ts';
import type { AppThunk } from '../../store.ts';
import { profileHashes } from './profileHashes.ts';

// Tells a contact which picture, phone, description and birthday we have now (by their hashes), so they can ask for
// a part if theirs is different.
export const offerProfile = (id: string): AppThunk<Promise<void>> => async (_dispatch, getState) => {
  sendControl(id, { t: ControlType.Profile, ...await profileHashes(getState().profile) });
};
