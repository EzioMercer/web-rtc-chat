# TODO

Only open items. Everything done is described in the README.

- [ ] Deleting a message on our side only.
- [ ] Blocking a contact without deleting them: their relay notes and connections are ignored until unblocked.
- [ ] Going to a date in a chat's history.
- [ ] Captions on files (text sent with the file).
- [ ] Feedback: links that open a GitHub Issue (bugs) or Discussion (ideas), filled in; logs are attached by hand,
  the app sends nothing by itself.
- [ ] GIFs: they already play when sent as files. Decide whether a GIF search is worth a third-party server.
- [ ] Deleting a message on both sides (the other side could still keep a copy).
- [ ] Editing sent messages, with an "edited" mark.
- [ ] Read receipts (a double check).
- [ ] Not telling a contact that we read their messages, one way only: they can still tell us.
- [ ] Themes.
- [ ] Settings per contact.
- [ ] A contact's own page (like WhatsApp or Telegram), with links, files and media in tabs.
- [ ] Search in all chats.
- [ ] Notifications inside the app while it is open (no push yet).
- [ ] Sending photos and videos in a lower resolution (the original is not kept).
- [ ] Loading long chats a page at a time as you scroll, instead of all at start.
- [ ] Sorting chats into categories or with tags (not decided which).
- [ ] Temporary chats inside the other three protection modes: one chat that saves nothing.
- [ ] A longer relay list with fallback when relays die. It must be the same, in the same order, for everyone, so peers
  still meet on the same relays. Possibly fetched from a source we control, such as a file in this repo.
- [ ] The same file, GIF or media sent or received more than once is stored only once on the device.
- [ ] Getting a file back from a contact who still has it, when ours is lost.
- [ ] Messages to a contact who is offline while you close the app (today they wait only while your tab is open),
  encrypted.
- [ ] Push notifications when the tab is closed, through a stateless Cloudflare Worker that forwards end-to-end
  encrypted web pushes. Look for a free way to send them.
- [ ] Syncing chats between your own devices automatically, without a backup file (today: a backup file moved by
  hand, one device at a time).
- [ ] Multiple devices per person.
