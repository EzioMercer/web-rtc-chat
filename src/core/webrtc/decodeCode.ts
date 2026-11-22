import { unzipText } from '../compression/unzipText.ts';

// Unpacks a code made by `encodeCode`. Throws `Invalid code` for anything else.
export const decodeCode = async (code: string): Promise<RTCSessionDescriptionInit> => {
  let desc: unknown;

  try {
    desc = JSON.parse(await unzipText(code));
  } catch {
    throw new Error('Invalid code');
  }

  const { type, sdp } = (desc ?? {}) as Partial<RTCSessionDescriptionInit>;

  if ((type !== 'offer' && type !== 'answer') || typeof sdp !== 'string') {
    throw new Error('Invalid code');
  }

  return { type, sdp };
};
