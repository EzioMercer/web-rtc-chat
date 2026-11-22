import { zipText } from '../compression/zipText.ts';

// Packs a session description into a single string that is easy to copy: zipped, so about 30% shorter.
export const encodeCode = ({ type, sdp }: RTCSessionDescriptionInit): Promise<string> => zipText(
  JSON.stringify({ type, sdp }),
);
