import { remoteStreamChanged } from '../store/call/callSlice.ts';
import { connectionFailed } from '../store/connection/connectionSlice.ts';
import type { AppDispatch } from '../store/store.ts';
import { bindChannel } from './bindChannel.ts';
import { CONTROL_LABEL, FILE_LABEL, RTC_CONFIG } from './config.ts';
import { negotiate } from './negotiate.ts';
import { receiveFile } from './receiveFile.ts';
import { sendControl } from './sendControl.ts';
import { rtc } from './state.ts';

// The single peer connection of this page, created on first use.
export const getPeer = (dispatch: AppDispatch): RTCPeerConnection => {
  if (rtc.peer) {
    return rtc.peer;
  }

  const peer = new RTCPeerConnection(RTC_CONFIG);

  peer.ondatachannel = ({ channel }) => {
    if (channel.label === CONTROL_LABEL) {
      bindChannel(channel, dispatch);
    } else if (channel.label === FILE_LABEL) {
      receiveFile(channel, dispatch);
    }
  };

  peer.ontrack = ({ track, streams }) => {
    rtc.remoteStream = streams[0] ?? rtc.remoteStream ?? new MediaStream();

    if (!rtc.remoteStream.getTracks().includes(track)) {
      rtc.remoteStream.addTrack(track);
    }

    dispatch(remoteStreamChanged());
  };

  peer.onnegotiationneeded = () => negotiate(peer);

  // Candidates found during renegotiation go over the control channel (the first ones are inside the codes).
  peer.onicecandidate = ({ candidate }) => {
    if (candidate) {
      sendControl({ t: 'ice', candidate: candidate.toJSON() });
    }
  };

  peer.onconnectionstatechange = () => {
    if (peer.connectionState === 'failed') {
      dispatch(connectionFailed());
    }
  };

  rtc.peer = peer;

  return peer;
};
