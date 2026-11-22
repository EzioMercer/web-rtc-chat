import { sendSignal } from '../../../core/signaling/sendSignal.ts';
import type { SignalMessage } from '../../../core/signaling/types.ts';
import { errorText } from '../../../core/webrtc/errorText.ts';
import { handleDescription } from '../../../core/webrtc/handleDescription.ts';
import { sessions } from '../../../core/webrtc/state.ts';
import { waitForIceGathering } from '../../../core/webrtc/waitForIceGathering.ts';
import type { AppThunk } from '../../store.ts';
import { finishRescue, refreshIceServers, startRescue } from '../session/rescuePath.ts';

type PathSignal = Extract<SignalMessage, { t: 'path' }>;

// The other side lost the network path of our open connection and searches for a new one (see rescuePath):
// answer through the relays, keeping the connection.
export const receivePath = (id: string, msg: PathSignal): AppThunk<Promise<void>> => async (dispatch, getState) => {
  const session = sessions.get(id);
  const contact = getState().contacts.list.find(c => c.id === id);

  if (!session || !contact || session.sid !== msg.sid || !session.opened || typeof msg.sdp !== 'string') {
    session?.log('Got a new path search for an old connection; ignored.');

    return;
  }

  const { peer } = session;

  try {
    if (msg.type === 'answer') {
      if (peer.signalingState === 'have-local-offer') {
        await handleDescription(id, { type: 'answer', sdp: msg.sdp });
      }

      dispatch(finishRescue(session));

      return;
    }

    if (msg.type !== 'offer') {
      return;
    }

    dispatch(startRescue(session, 'They lost the network path. Looking for a new one together…'));
    await refreshIceServers(session);
    await handleDescription(id, { type: 'offer', sdp: msg.sdp }, async () => {
      // Every address in the answer: ones found later couldn't be sent.
      await waitForIceGathering(peer);

      if (sessions.get(id) === session && peer.localDescription?.type === 'answer') {
        await sendSignal(contact, { t: 'path', sid: session.sid, type: 'answer', sdp: peer.localDescription.sdp });
        session.log('Answered their new path search through the relays.');
      }
    });
    dispatch(finishRescue(session));
  } catch (err) {
    session.log(`New path search failed: ${errorText(err)}`);
  }
};
