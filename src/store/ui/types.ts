export type UiState = {
  // Open conversation: a contact id, the manual connection, or none (shows the list on phones).
  selected: string | null;
  // Conversation key -> the message our next one answers (see takeReply). Not saved.
  replying: Record<string, string>;
};
