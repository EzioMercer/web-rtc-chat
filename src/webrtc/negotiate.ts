import { sendControl } from './sendControl.ts';
import { rtc } from './state.ts';

// Sends a new offer over the control channel when tracks are added or removed during a call.
// The first offer/answer is exchanged by hand (codes), so nothing is sent before the channel is open.
export const negotiate = async (peer: RTCPeerConnection) => {
  if (rtc.channel?.readyState !== 'open') {
    return;
  }

  try {
    rtc.makingOffer = true;
    await peer.setLocalDescription();

    if (peer.localDescription) {
      sendControl({ t: 'sdp', description: peer.localDescription.toJSON() });
    }
  } catch (err) {
    console.error('Renegotiation failed', err);
  } finally {
    rtc.makingOffer = false;
  }
};
