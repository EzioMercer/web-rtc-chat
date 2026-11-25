import type { Contact } from '../../store/contacts/types.ts';
import type { StoredMessage } from '../history/types.ts';

// Readable without the password: only what is needed to open the rest.
export type BackupHeader = {
  // Salt of the password's key (Argon2id).
  salt: string;
  // The backup's own key, encrypted with the password's key.
  key: string;
};

export type BackupChat = {
  id: string;
  name: string;
  messages: number;
  // Whether its files and voice/video messages are in the backup, and their size.
  media: boolean;
  mediaBytes: number;
};

export type BackupInfo = {
  createdAt: number;
  chats: BackupChat[];
  // Our picture, phone number, description and birthday (see ProfileState), those we had.
  picture?: string;
  phone?: string;
  about?: string;
  birthday?: string;
};

export type ContactRecord = {
  contact: Contact;
  // Our private key for this contact (PKCS#8, base64url).
  key: string | null;
};

export type PageRecord = {
  chat: string;
  messages: StoredMessage[];
};

export type FileRecord = {
  chat: string;
  id: string;
  size: number;
};

// What to put into a backup, per chat.
export type ChatChoice = {
  id: string;
  media: boolean;
};
