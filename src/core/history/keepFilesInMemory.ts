import { type Message, FileStatus, MessageAuthor, MessageKind } from '../../store/chat/types.ts';
import { loadFileBlob } from './loadFileBlob.ts';
import { memoryFileKey } from './memoryFileKey.ts';
import { memoryFiles } from './memoryFiles.ts';

// Reads every saved file of these chats into memory, before the saved copies are deleted (going temporary): those
// that arrived or went out, and ours still to be sent (saved when chosen; one that is missing stays missing).
export const keepFilesInMemory = async (chats: Record<string, Message[]>) => {
  for (const [chat, messages] of Object.entries(chats)) {
    for (const message of messages) {
      const key = memoryFileKey(chat, message.id);

      if (message.kind !== MessageKind.File || memoryFiles.has(key)) {
        continue;
      }

      if (message.status === FileStatus.Done) {
        memoryFiles.set(key, await loadFileBlob(chat, message));
      } else if (message.from === MessageAuthor.Me) {
        const blob = await loadFileBlob(chat, message).catch(() => null);

        if (blob) {
          memoryFiles.set(key, blob);
        }
      }
    }
  }
};
