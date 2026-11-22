import { decodeCode } from '../../../core/webrtc/decodeCode.ts';
import { stepFailed } from '../../manual/manualSlice.ts';
import type { AppThunk } from '../../store.ts';
import { connect } from './connect.ts';
import { host } from './host.ts';
import { join } from './join.ts';
import { ManualRole } from '../../manual/types.ts';

// The single action button: an empty field makes you the host, an invite makes you the client,
// and a reply pasted by the host connects.
export const submitPeerCode = (raw: string): AppThunk<Promise<void>> => async (dispatch, getState) => {
  const { role } = getState().manual;

  try {
    if (role === ManualRole.None && !raw.trim()) {
      await dispatch(host());

      return;
    }

    const desc = decodeCode(raw);

    if (role === ManualRole.Host) {
      if (desc.type !== 'answer') {
        throw new Error('That\'s an invite code. Paste the peer\'s reply instead.');
      }

      await dispatch(connect(desc));

      return;
    }

    if (desc.type !== 'offer') {
      throw new Error('That\'s a reply code. Paste the host\'s invite instead.');
    }

    await dispatch(join(desc));
  } catch (err) {
    dispatch(stepFailed(err instanceof Error ? err.message : 'Something went wrong'));
  }
};
