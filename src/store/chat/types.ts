// Strings: they are also the CSS class names of the message bubbles.
export enum MessageAuthor {
  Me = 'me',
  Peer = 'peer',
  System = 'system',
}

// Saved or sent as numbers: never change a value; add new ones at the end.
export enum MessageKind {
  Text = 0,
  File = 1,
}

// Saved or sent as numbers: never change a value; add new ones at the end.
export enum NoteType {
  Voice = 0,
  Video = 1,
}

// Saved or sent as numbers: never change a value; add new ones at the end.
export enum FileStatus {
  Transferring = 0,
  Done = 1,
  Failed = 2,
}

export type TextMessage = {
  kind: MessageKind.Text;
  id: string;
  from: MessageAuthor;
  text: string;
  // When it was written, on this device's clock (see receivePeerText for theirs).
  at?: number;
  // Our messages: waiting for the other side to confirm it arrived (sent again when the connection reopens).
  pending?: boolean;
};

// A voice or video message recorded in the app. `duration` is in ms (recorded WebM files don't say how long they are);
// `wave` is the loudness over time for voice messages, 0-31 per bar.
export type MediaNote = {
  type: NoteType;
  duration: number;
  wave?: number[];
};

export type FileMessage = {
  kind: MessageKind.File;
  id: string;
  from: MessageAuthor;
  name: string;
  size: number;
  mime: string;
  // Object URL of the file (in memory); on the receiving side it is set once the whole file arrived.
  url: string | null;
  transferred: number;
  status: FileStatus;
  // Why it failed, in words for the user.
  error?: string;
  // Set for voice and video messages.
  note?: MediaNote;
  // Sent zipped: this many bytes travel (and count toward the TURN limit) instead of `size`.
  packed?: number;
  at?: number;
};

export type Message = TextMessage | FileMessage;

// Saved on the device, encrypted (see core/history), except for temporary identities and the manual connection.
export type ChatState = {
  // Conversation key (contact id, or the manual connection) -> messages.
  conversations: Record<string, Message[]>;
  unread: Record<string, number>;
};
