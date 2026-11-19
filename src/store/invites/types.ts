// An invite someone gave us (from a link or QR), waiting for us to name the contact.
export type ReceivedInvite = {
  identity: string;
  secret: string;
  expiresAt: number;
};

// Someone used our invite and wants to be added.
export type ContactRequest = {
  id: string;
  identity: string;
  secret: string;
};

export type InvitesState = {
  // Our current invite link, while it is valid.
  mine: { link: string; expiresAt: number } | null;
  received: ReceivedInvite | null;
  requests: ContactRequest[];
  error: string | null;
};
