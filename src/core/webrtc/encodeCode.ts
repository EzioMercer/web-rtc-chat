// Packs a session description into a single string that is easy to copy.
export const encodeCode = ({ type, sdp }: RTCSessionDescriptionInit): string => btoa(JSON.stringify({ type, sdp }));
