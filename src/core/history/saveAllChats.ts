import { type Message, FileStatus, MessageAuthor, MessageKind } from '../../store/chat/types.ts';
import { historySaver } from './historySaver.ts';
import { memoryFileKey } from './memoryFileKey.ts';
import { memoryFiles } from './memoryFiles.ts';
import { saveFileBytes } from './saveFileBytes.ts';
import { saveUnread } from './saveUnread.ts';
import { writePages } from './writePages.ts';

// Saves these chats and their files from scratch (a temporary identity starts saving).
export const saveAllChats = async (chats: Record<string, Message[]>, unread: Record<string, number>) => {
  historySaver.reset();

  for (const [chat, messages] of Object.entries(chats)) {
    await historySaver.run(() => writePages(chat, [], messages));

    for (const message of messages) {
      const blob = memoryFiles.get(memoryFileKey(chat, message.id));

      // Ours still to be sent too, so they can go after a reload.
      if (message.kind === MessageKind.File && blob
        && (message.status === FileStatus.Done || message.from === MessageAuthor.Me)) {
        await saveFileBytes(chat, message.id, blob);
      }
    }
  }

  await saveUnread(unread);
  historySaver.loaded(chats);
};
