// The connection has a working network path.
export const isWorking = (peer: RTCPeerConnection) => (
  peer.iceConnectionState === 'connected' || peer.iceConnectionState === 'completed'
);
