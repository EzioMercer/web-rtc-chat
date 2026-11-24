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
  Location = 2,
  // Their message that we deleted (see DeletedMessage).
  Deleted = 3,
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
  // Ours: not sent yet, it goes when the connection opens (see RESEND_MS).
  Waiting = 3,
}

// How messages answer each other, kept on both ends: a reply has the id of the message it answers, and that message
// has the ids of its replies. Both are ids in this chat (see toTheirId for the other side's). When either one is
// deleted, the other forgets it: a reply whose message is gone is a normal message again. The quote is never a copy:
// it is drawn from the answered message as it is now.
export type ReplyLinks = {
  replyTo?: string;
  replies?: string[];
};

export type TextMessage = ReplyLinks & {
  kind: MessageKind.Text;
  id: string;
  from: MessageAuthor;
  text: string;
  // When it was written, on this device's clock (see receivePeerText for theirs).
  at?: number;
  // Our messages: waiting for the other side to confirm it arrived (sent again when the connection reopens).
  pending?: boolean;
  // Ours, pending: the open connection took it (it may be on its way). Cleared when the connection closes.
  sent?: boolean;
  // Ours: a connection took it at least once, so it may have arrived (it can't be held back with "Don't send").
  tried?: boolean;
  // Ours: not confirmed within RESEND_MS, so it is no longer sent by itself (Send again sends it).
  unsent?: boolean;
};

// A voice or video message recorded in the app. `duration` is in ms (recorded WebM files don't say how long they are);
// `wave` is the loudness over time for voice messages, 0-31 per bar.
export type MediaNote = {
  type: NoteType;
  duration: number;
  wave?: number[];
};

export type FileMessage = ReplyLinks & {
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
  // Ours: a transfer of it broke, so it may have arrived (as for texts, see TextMessage).
  tried?: boolean;
};

// A place on Earth, in degrees; `accuracy` is in metres (how far off it may be).
export type GeoPoint = {
  lat: number;
  lng: number;
  accuracy?: number;
};

// A place shared in the chat: once, or live (it moves with the sender until `liveUntil`).
export type LocationMessage = GeoPoint & ReplyLinks & {
  kind: MessageKind.Location;
  id: string;
  from: MessageAuthor;
  at?: number;
  // Live location: when it stops, on this device's clock (an early stop sets it to the time of the stop). Missing
  // for a one-time location.
  liveUntil?: number;
  // Live location: when the place last came (theirs) or was last sent (ours).
  updatedAt?: number;
  // Counts every change of a live location, so an old copy never overwrites a newer one (and a confirmation only
  // counts for the change it confirms).
  rev?: number;
  // Ours: waiting for the other side to confirm its latest change (sent again when the connection reopens).
  pending?: boolean;
  // As for texts (see TextMessage).
  sent?: boolean;
  tried?: boolean;
  unsent?: boolean;
};

// A message we deleted on our side, never shown. Theirs leaves only its id and time until `until` (on our clock), so
// a copy they send again (when our confirmation was lost) or a live location's next move is known and dropped. Ours
// leaves one only for a live location whose stop they haven't confirmed yet (`stop`, sent when the connection
// opens); other messages of ours are simply removed.
export type DeletedMessage = {
  kind: MessageKind.Deleted;
  id: string;
  from: MessageAuthor;
  at?: number;
  until: number;
  stop?: LocationMessage;
};

export type Message = TextMessage | FileMessage | LocationMessage | DeletedMessage;

// Saved on the device, encrypted (see core/history), except for temporary identities and the manual connection.
export type ChatState = {
  // Conversation key (contact id, or the manual connection) -> messages.
  conversations: Record<string, Message[]>;
  unread: Record<string, number>;
};
