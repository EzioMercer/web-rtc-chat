import { pictureHash } from '../../../core/profile/pictureHash.ts';
import { sendControl } from '../../../core/webrtc/sendControl.ts';
import { ControlType } from '../../../core/webrtc/types.ts';
import type { AppThunk } from '../../store.ts';

// Tells a contact which picture we have now (by its hash), so they can ask for it if theirs is different.
export const offerPicture = (id: string): AppThunk<Promise<void>> => async (_dispatch, getState) => {
  sendControl(id, { t: ControlType.Picture, hash: await pictureHash(getState().profile.picture) });
};
