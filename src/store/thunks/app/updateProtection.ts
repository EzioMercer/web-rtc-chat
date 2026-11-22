import { historySaver } from '../../../core/history/historySaver.ts';
import { keepFilesInMemory } from '../../../core/history/keepFilesInMemory.ts';
import { saveAllChats } from '../../../core/history/saveAllChats.ts';
import { slots } from '../../../core/history/slots.ts';
import { changeProtection } from '../../../core/identity/changeProtection.ts';
import { type ProtectionChoice, ProtectionMode } from '../../../core/identity/types.ts';
import { busyStarted, failed, unlocked } from '../../app/appSlice.ts';
import type { AppThunk } from '../../store.ts';
import { errorMessage } from './errorMessage.ts';

// Switches how the identity is protected. Returns whether it worked. Going temporary keeps the chats in this tab
// only; leaving temporary saves them.
export const updateProtection = (choice: ProtectionChoice): AppThunk<Promise<boolean>> => async (
  dispatch,
  getState,
) => {
  dispatch(busyStarted());

  try {
    await historySaver.flush();

    const { contacts, chat, settings } = getState();
    const chats = Object.fromEntries(Object.entries(chat.conversations)
      .filter(([key]) => contacts.list.some(contact => contact.id === key)));

    if (choice.mode === ProtectionMode.Temporary) {
      await keepFilesInMemory(chats);
    }

    const startsSaving = await changeProtection(choice, contacts.list, settings);

    if (choice.mode === ProtectionMode.Temporary) {
      historySaver.reset();
      slots.map.clear();
    } else if (startsSaving) {
      await saveAllChats(chats, chat.unread);
    }
  } catch (err) {
    dispatch(failed(errorMessage(err)));

    return false;
  }

  dispatch(unlocked(choice.mode));

  return true;
};
