// Live WebRTC objects. They are not serializable, so they live here instead of the Redux store.
type RtcState = {
  peer: RTCPeerConnection | null;
  // The control channel: chat text and in-band signaling.
  channel: RTCDataChannel | null;
  // Perfect negotiation: the polite peer (the client) yields when both send offers at once.
  polite: boolean;
  makingOffer: boolean;
  ignoreOffer: boolean;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  senders: RTCRtpSender[];
};

export const rtc: RtcState = {
  peer: null,
  channel: null,
  polite: false,
  makingOffer: false,
  ignoreOffer: false,
  localStream: null,
  remoteStream: null,
  senders: [],
};
