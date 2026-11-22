// Unpacks a code made by `encodeCode`. Throws `Invalid code` for anything else.
export const decodeCode = (code: string): RTCSessionDescriptionInit => {
  let desc: unknown;

  try {
    desc = JSON.parse(atob(code.trim()));
  } catch {
    throw new Error('Invalid code');
  }

  const { type, sdp } = (desc ?? {}) as Partial<RTCSessionDescriptionInit>;

  if ((type !== 'offer' && type !== 'answer') || typeof sdp !== 'string') {
    throw new Error('Invalid code');
  }

  return { type, sdp };
};
