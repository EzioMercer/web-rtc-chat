import type { ContactKey } from './types.ts';

// Our key pair for each contact, by contact id. Each contact gets its own, so no two contacts see the same key and
// can't tell they know the same person. A contact still being added (an open invite, a request, an invite we used)
// is here too, under the id it will get. Memory only; saveContacts saves the keys of saved contacts.
export const contactKeys = new Map<string, ContactKey>();
