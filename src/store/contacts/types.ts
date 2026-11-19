export type Contact = {
  // Local id, never sent anywhere.
  id: string;
  // Chosen by us; only we see it.
  name: string;
  favourite: boolean;
  // We compared the safety code with this contact.
  verified: boolean;
  // Their public identity key. Everything they send through relays must be signed by it.
  identity: string;
  // Shared mailbox secrets we listen on, newest first (old ones stay briefly while we rotate).
  secrets: string[];
  // The shared secret we use to reach them.
  sendSecret: string;
};

export type ContactsState = {
  // Display order: favourites first, each group in this order.
  list: Contact[];
};
