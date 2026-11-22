import type { Contact } from '../../store/contacts/types.ts';

// Exactly one side of every pair is polite: it yields when both sides send offers at the same time.
export const isPolite = (contact: Contact): boolean => contact.myKey < contact.identity;
