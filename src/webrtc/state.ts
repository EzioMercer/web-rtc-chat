// Live WebRTC objects. They are not serializable, so they live here instead of the Redux store.
export const rtc: { peer: RTCPeerConnection | null; channel: RTCDataChannel | null } = {
  peer: null,
  channel: null,
};
