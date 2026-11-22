import { bytesToB64 } from '../crypto/bytesToB64.ts';
import { randomBytes } from '../crypto/randomBytes.ts';
import { slots } from './slots.ts';

// The slot of `chat`'s saved history, made up now if it has none yet (written with the next save).
export const ensureSlot = (chat: string): string => {
  let slot = slots.map.get(chat);

  if (!slot) {
    slot = bytesToB64(randomBytes(9));
    slots.map.set(chat, slot);
    slots.version += 1;
  }

  return slot;
};
