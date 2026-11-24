// What the message menu offers.
export enum MessageAction {
  // Answer it: the next message we send quotes it.
  Reply,
  Copy,
  // Ours that hasn't gone out yet: it is removed and never sent.
  DontSend,
  // Ours given up on (see RESEND_MS): it goes to the end and is sent again.
  SendAgain,
  DeleteForMe,
}
