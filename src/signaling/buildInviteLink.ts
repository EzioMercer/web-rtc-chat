import { bytesToB64 } from '../crypto/bytesToB64.ts';
import { utf8 } from '../crypto/utf8.ts';
import type { InvitePayload } from './invitePayload.ts';

// The invite goes after `#`, which browsers never send to the server.
export const buildInviteLink = (payload: InvitePayload): string => {
  const base = new URL(import.meta.env.BASE_URL, window.location.origin);

  return `${base.href}#invite=${bytesToB64(utf8(JSON.stringify(payload)))}`;
};
