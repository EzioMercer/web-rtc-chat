import { inviteCommitment } from '../../../core/signaling/inviteCommitment.ts';
import { openEnvelope } from '../../../core/signaling/openEnvelope.ts';
import { pendingJoins } from '../../../core/signaling/pendingJoins.ts';
import { SignalType } from '../../../core/signaling/types.ts';

// The inviter revealed their key (in `mailbox`). It counts only if it hashes to what their invite link showed.
export const receiveInviteReveal = async (mailbox: string, plaintext: string): Promise<void> => {
  const pending = pendingJoins.get(mailbox);
  const body = pending ? await openEnvelope(plaintext, null, pending.myKey) : null;

  if (!pending || body?.msg.t !== SignalType.InviteReveal) {
    return;
  }

  if (await inviteCommitment(body.from) === pending.commitment) {
    pending.done(body.from);
  }
};
