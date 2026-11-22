import { b64ToBytes } from '../crypto/b64ToBytes.ts';
import type { InvitePayload } from './invitePayload.ts';
import { isSecret } from './isSecret.ts';

// Reads an invite from a link, a `#invite=...` fragment, or the bare code. Returns null if it isn't one.
export const parseInviteLink = (text: string): InvitePayload | null => {
  const match = /invite=([A-Za-z0-9_-]+)/.exec(text.trim());

  if (!match) {
    return null;
  }

  try {
    const payload = JSON.parse(new TextDecoder().decode(b64ToBytes(match[1]))) as Partial<InvitePayload>;

    if (payload.v !== 2 || !isSecret(payload.c) || !isSecret(payload.s) || typeof payload.e !== 'number') {
      return null;
    }

    return payload as InvitePayload;
  } catch {
    return null;
  }
};
