// File ids are only unique within one chat.
export const memoryFileKey = (chat: string, id: string) => `${chat}\n${id}`;
