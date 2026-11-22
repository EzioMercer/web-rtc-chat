import { b64ToBytes } from '../crypto/b64ToBytes.ts';
import type { InvitePayload } from './invitePayload.ts';

// Reads an invite from a link, a `#invite=...` fragment, or the bare code. Returns null if it isn't one.
export const parseInviteLink = (text: string): InvitePayload | null => {
  const match = /invite=([A-Za-z0-9_-]+)/.exec(text.trim());

  if (!match) {
    return null;
  }

  try {
    const payload = JSON.parse(new TextDecoder().decode(b64ToBytes(match[1]))) as Partial<InvitePayload>;

    if (payload.v !== 1 || typeof payload.k !== 'string' || typeof payload.s !== 'string'
      || typeof payload.e !== 'number' || b64ToBytes(payload.s).length !== 32) {
      return null;
    }

    return payload as InvitePayload;
  } catch {
    return null;
  }
};
