export type Contact = {
  // Local id, never sent anywhere.
  id: string;
  // Chosen by us; only we see it.
  name: string;
  favourite: boolean;
  // We compared the safety code with this contact.
  verified: boolean;
  // The safety code both sides worked out while adding each other (see inviteSafety).
  safety: string;
  // Their public key for us. Everything they send through relays must be signed by it.
  identity: string;
  // Our public key for them (the private half is in contactKeys). Nobody else gets it.
  myKey: string;
  // Shared mailbox secrets we listen on, newest first (old ones stay briefly while we rotate).
  secrets: string[];
  // The shared secret we use to reach them.
  sendSecret: string;
  // The picture they sent us (see core/profile); none when missing.
  picture?: string;
  // The phone number and description they sent us (see ProfileInfo); none when missing.
  phone?: string;
  about?: string;
  // When we were last connected to them (ms since 1970), as this device saw it: set when the connection opens,
  // every few minutes while it stays open, and when it closes. Null until the first connection.
  lastConnected: number | null;
};

export type ContactsState = {
  // Display order: favourites first, each group in this order.
  list: Contact[];
};
