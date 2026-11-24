import { toTheirId } from './toTheirId.ts';
import type { ReplyLinks } from './types.ts';

// What a message we send says about the one it answers, in the other side's terms (nothing for a normal one).
export const replyField = (message: ReplyLinks): { replyTo?: string } => (
  message.replyTo === undefined ? {} : { replyTo: toTheirId(message.replyTo) }
);
