import { useAppSelector } from '../../store/useAppSelector.ts';

// What the other side of conversation `key` is called here: the contact's name (the manual connection has none).
export const usePeerName = (key: string) => useAppSelector(
  state => state.contacts.list.find(contact => contact.id === key)?.name ?? 'Them',
);
