// An invite someone gave us (from a link or QR), waiting for us to name the contact.
export type ReceivedInvite = {
  // Stands for the inviter's key until they reveal it (see inviteCommitment).
  commitment: string;
  secret: string;
  expiresAt: number;
};

// Someone used our invite and wants to be added.
export type ContactRequest = {
  // Also where our key for them is kept until then (contactKeys), and their contact id if they are new.
  id: string;
  identity: string;
  secret: string;
  // Their safety code (see inviteSafety).
  safety: string;
};

export type InvitesState = {
  // Our current invite link, while it is valid.
  mine: { link: string; expiresAt: number } | null;
  received: ReceivedInvite | null;
  requests: ContactRequest[];
  error: string | null;
};
