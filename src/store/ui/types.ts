export type UiState = {
  // Open conversation: a contact id, the manual connection, or none (shows the list on phones).
  selected: string | null;
  // Conversation key -> the message our next one answers (see takeReply). Not saved.
  replying: Record<string, string>;
  // Where the "Unread messages" line goes in the open conversation: before the message that was the first unread
  // one when it was opened (or came into view again). It stays while the conversation is open. Not saved.
  unreadLine: { key: string; id: string } | null;
};
