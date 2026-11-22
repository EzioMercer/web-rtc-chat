// Where saved chats live in storage. Each chat has a random slot; its pages and files are saved under it, and the
// slot list says which contact each slot belongs to. Replacing a chat (e.g. from a backup) writes a new slot and
// then switches the list over in one step, so a closed tab never leaves half of one and half of the other.
const pad = (n: number) => String(n).padStart(6, '0');

export const historyKeys = {
  // Contact id -> slot.
  slots: 'slots',
  // Unread count per contact.
  unread: 'unread',
  pages: 'page:',
  files: 'file:',
  page: (slot: string, n: number) => `page:${slot}:${pad(n)}`,
  pagesOf: (slot: string) => `page:${slot}:`,
  chunk: (slot: string, id: string, n: number) => `file:${slot}:${id}:${pad(n)}`,
  chunksOf: (slot: string, id: string) => `file:${slot}:${id}:`,
  filesOf: (slot: string) => `file:${slot}:`,
  // The slot a page or file key belongs to.
  slotOf: (key: string) => key.split(':')[1] ?? '',
};
