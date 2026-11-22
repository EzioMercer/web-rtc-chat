import { type Message, FileStatus, MessageKind } from '../../store/chat/types.ts';
import { loadFileBlob } from './loadFileBlob.ts';
import { memoryFileKey } from './memoryFileKey.ts';
import { memoryFiles } from './memoryFiles.ts';

// Reads every saved file of these chats into memory, before the saved copies are deleted (going temporary).
export const keepFilesInMemory = async (chats: Record<string, Message[]>) => {
  for (const [chat, messages] of Object.entries(chats)) {
    for (const message of messages) {
      const key = memoryFileKey(chat, message.id);

      if (message.kind === MessageKind.File && message.status === FileStatus.Done && !memoryFiles.has(key)) {
        memoryFiles.set(key, await loadFileBlob(chat, message));
      }
    }
  }
};
