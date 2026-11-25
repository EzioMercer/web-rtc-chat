# TODO

Only open items. Everything done is described in the README.

- [ ] Marking all chats as read.
- [ ] Pinning and unpinning a contact.
- [ ] Last connected: when a contact was last connected to us.
- [ ] Birthday in the profile.
- [ ] Mood in the profile: a short status shown under the name.
- [ ] Blocking a contact without deleting them: their relay notes and connections are ignored until unblocked.
- [ ] Archiving and unarchiving a contact: the chat is only hidden, messages still arrive, and unread counts show on
  an "Archived" entry.
- [ ] Removing a chat from the chat list, keeping the contact.
- [ ] Checking only recent messages for resending, giving up and markers, not the whole chat: back until one is older
  than 1.5 hours and more than 50 back. Old waiting ones and markers are handled once, when the chat is loaded.
- [ ] Going to a date in a chat's history.
- [ ] Captions on files (text sent with the file).
- [ ] Forwarding a message (text, file, voice or video message, location) to another contact, with a "forwarded"
  mark.
- [ ] Replying to a part of a message's text.
- [ ] Feedback: links that open a GitHub Issue (bugs) or Discussion (ideas), filled in; logs are attached by hand,
  the app sends nothing by itself.
- [ ] GIFs: they already play when sent as files. Decide whether a GIF search is worth a third-party server.
- [ ] Deleting a message on both sides (the other side could still keep a copy). Its replies become normal
  messages on both sides, as Delete for me does on one (see `unlink` in chatSlice); a hidden marker keeps a late copy
  out.
- [ ] Hiding profile info one piece at a time, from everyone or per contact; hiding asks their device to remove it
  (they could still keep a copy).
- [ ] Selecting several messages, then: Delete for me, Delete for everyone (needs the item above), or Copy as plain
  text that shows who wrote each one, to whom and when, so it reads clearly when pasted into Notepad or similar.
- [ ] Selecting several chats, then: Delete (not decided what it does), Block, Archive, Mark as read or Snooze.
- [ ] Editing sent messages, with an "edited" mark. Quotes need nothing: they are drawn from the message as it is.
- [ ] Pinning and unpinning a message, for me or for both of us.
- [ ] Reactions.
- [ ] Read receipts (a double check).
- [ ] Not telling a contact that we read their messages, one way only: they can still tell us.
- [ ] Notes: a chat with yourself.
- [ ] Themes.
- [ ] Settings per contact.
- [ ] A contact's own page (like WhatsApp or Telegram), with links, files and media in tabs.
- [ ] Search in all chats.
- [ ] Notifications inside the app while it is open (no push yet).
- [ ] Sending photos and videos in a lower resolution (the original is not kept).
- [ ] Link previews, if free: a server would fetch the page (and see the link). The sender makes the preview and sends
  it, so the receiver's browser never visits the site.
- [ ] Loading long chats a page at a time as you scroll, instead of all at start. Replies need a message found by
  id without loading its page (linking a reply, unlinking on delete, a tap on a quote).
- [ ] Threads: a message's replies on their own (each message already lists them, `replies`).
- [ ] Video calls showing both cameras and shared screens at once (like Google Meet).
- [ ] Sorting chats into categories or with tags (not decided which).
- [ ] Temporary chats inside the other three protection modes: one chat that saves nothing.
- [ ] A longer relay list with fallback when relays die. It must be the same, in the same order, for everyone, so peers
  still meet on the same relays. Possibly fetched from a source we control, such as a file in this repo.
- [ ] Continuing a broken file upload from where it stopped, instead of starting over.
- [ ] The same file, GIF or media sent or received more than once is stored only once on the device.
- [ ] Getting a file back from a contact who still has it, when ours is lost.
- [ ] Different accounts on one device.
- [ ] Messages to a contact who is offline while you close the app (today they go only while your tab is open, for
  up to an hour), encrypted.
- [ ] Groups.
- [ ] Channels (need groups).
- [ ] Push notifications when the tab is closed, through a stateless Cloudflare Worker that forwards end-to-end
  encrypted web pushes. Look for a free way to send them.
- [ ] Syncing chats between your own devices automatically, without a backup file (today: a backup file moved by
  hand, one device at a time).
- [ ] Multiple devices per person.
