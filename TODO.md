# TODO

Only open items. Everything done is described in the README.

- [ ] Push notifications when the tab is closed, through a stateless Cloudflare Worker that forwards end-to-end
  encrypted web pushes.
- [ ] Syncing chats between your own devices automatically (today: a backup file moved by hand, one device at a
  time).
- [ ] Multiple devices per person.
- [ ] Messages to a contact who is offline while you close the app (today they wait only while your tab is open),
  encrypted.
- [ ] A longer relay list with fallback when relays die. It must be the same, in the same order, for everyone, so peers
  still meet on the same relays. Possibly fetched from a source we control, such as a file in this repo.
