import { connectionFailed } from '../store/connection/connectionSlice.ts';
import type { AppDispatch } from '../store/store.ts';
import { bindChannel } from './bindChannel.ts';
import { RTC_CONFIG } from './config.ts';
import { rtc } from './state.ts';

// The single peer connection of this page, created on first use.
export const getPeer = (dispatch: AppDispatch): RTCPeerConnection => {
  if (rtc.peer) {
    return rtc.peer;
  }

  const peer = new RTCPeerConnection(RTC_CONFIG);

  peer.ondatachannel = e => bindChannel(e.channel, dispatch);

  peer.onconnectionstatechange = () => {
    if (peer.connectionState === 'failed') {
      dispatch(connectionFailed());
    }
  };

  rtc.peer = peer;

  return peer;
};
