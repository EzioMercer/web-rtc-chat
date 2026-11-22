import { fileChannels } from './state.ts';

// Counts `channel` as one of `peer`'s open file channels until it closes.
export const trackFileChannel = (peer: RTCPeerConnection, channel: RTCDataChannel) => {
  const open = fileChannels.get(peer) ?? new Set<RTCDataChannel>();

  open.add(channel);
  fileChannels.set(peer, open);
  channel.addEventListener('close', () => open.delete(channel));
};
