# TODO

The goal is messenger-like access: tap a contact to chat or call, with no copy-pasting of codes. Everything stays
peer-to-peer and nothing is stored on any server.

## 📌 Pinned: safety code check

Do this first. Every later step relies on it.

- [ ] Compute a short safety code from both peers' DTLS certificate fingerprints:
  - read the `a=fingerprint` lines of the local and remote descriptions;
  - sort them so both sides get the same order;
  - SHA-256 the result;
  - map the first bytes to 4 emojis or 4 words.
- [ ] Show the safety code in the chat header, and on the "add contact" screen.
- [ ] Add a "Mark as verified" action and show a verified badge on the contact.
- [ ] Warn loudly if a verified contact's identity key ever changes.
- [ ] Explain the check to users in one sentence: "Compare these with your friend in person or by voice. If they
  differ, someone is in the middle."

## Phase 1: Identity

- [ ] On first launch, generate a long-term identity key pair with WebCrypto (Ed25519, or ECDSA P-256 as a fallback)
  and mark it non-extractable.
- [ ] Keep the identity key in IndexedDB. This is the only thing besides the contact list that is saved on the device.
- [ ] Never send the identity key to a relay as-is. Relays only ever see throwaway Nostr keys (see Phase 3).
- [ ] No sign-up, email, phone number or password.

## Phase 2: Adding contacts

- [ ] **In person, by QR code:**
  - the QR contains the public identity key and a one-time invite secret;
  - the friend scans it;
  - the "add me" request goes through Nostr;
  - both screens then show the safety code to compare.
- [ ] **Remotely, by invite link:** single-use, expires after 10 minutes, then confirmed with the safety code over an
  in-app voice call.
- [ ] Contact list: name (chosen locally), public identity key, mailbox secret, verified flag. Saved in IndexedDB on
  this device only.
- [ ] Rename and delete contacts.
- [ ] Later: a short spoken code (for example `4-tiger-violin-moon`), using a vetted protocol that turns a short
  password into a strong key (PAKE).

## Phase 3: Finding each other through Nostr

- [ ] Add `nostr-tools`.
- [ ] Connect to 3–5 public relays in parallel, with a configurable list.
- [ ] Use ephemeral events (kinds 20000–29999), which relays forward without storing.
- [ ] Encrypt every payload (NIP-44) and also sign it with the identity key.
- [ ] Use a fresh throwaway Nostr key for every connection attempt.
- [ ] Use a per-contact mailbox tag computed as HMAC(shared secret, date):
  - it changes daily;
  - relays can't link it to people.
- [ ] Ignore anything not signed by a known contact. Reject replays with a timestamp and nonce.
- [ ] Don't publish presence. "Is my friend online?" is asked only when the user opens that contact.
- [ ] Run the existing WebRTC offer/answer/ICE exchange over Nostr instead of copy-paste.
- [ ] Stay subscribed to our own mailboxes while the app is open, so contacts can reach us.
- [ ] Keep manual copy-paste codes as a hidden "connect manually" fallback.

## Phase 4: Rotating addresses after connecting

- [ ] After the first direct connection, exchange a new mailbox secret over the encrypted data channel, never over a
  relay.
- [ ] Rotate in two steps: send "new secret", wait for "ack", then retire the old one, so neither side gets lost if
  it goes offline mid-swap.
- [ ] Retire the invite after use, so a copied invite is worthless.

## Phase 5: UI rewrite

- [ ] Two-pane layout:
  - **left:** contact list;
  - **right:** the conversation with the selected contact.
- [ ] Contact list rows: name, status (online / connecting / offline), unread badge, verified mark.
- [ ] "Add contact" button at the top of the list, with QR and invite-link options.
- [ ] Right pane: the existing chat header, call panel, message list and composer, for the selected contact.
- [ ] Empty states: no contacts yet, and no contact selected.
- [ ] Mobile: show the list or the chat, with a back button.
- [ ] Settings: our own contact QR and link, and the relay list.
- [ ] Code changes:
  - one `RTCPeerConnection` per contact, replacing the `rtc` singleton with a map keyed by contact;
  - a per-contact connection state and message list in Redux;
  - only one call at a time across all contacts.

## Phase 6: Messages stay in memory only

Hard requirement: message text and files are never written to disk, a server, a relay or browser storage.

- [ ] Messages and received files live only in Redux memory. They're gone when the tab closes, as they are today.
- [ ] Only signaling (offers, answers, ICE candidates) goes over Nostr, never message content.
- [ ] Revoke the object URLs of received files when a conversation is cleared or the app closes.
- [ ] Never log message content to the console.
- [ ] No analytics, trackers or third-party scripts.
- [ ] Enforce this with ESLint:
  - ban `localStorage`, `sessionStorage`, `indexedDB`, `caches`, `document.cookie`, `fetch`, `XMLHttpRequest`,
    `WebSocket` and `sendBeacon` everywhere;
  - allow them only in the identity/contacts storage module and the Nostr module.
- [ ] Add a "Clear conversation" action.

## Phase 7: Reliability

- [ ] Reconnect automatically when the network changes, using an ICE restart signaled over Nostr if the data
  channel is down.
- [ ] Optional TURN server (for example Cloudflare) for strict networks. This also hides the IP address from the
  peer.
- [ ] Handle relays that are down or slow, by racing all relays and using whichever answers first.

## Later (not planned yet)

- [ ] Push notifications when the tab is closed, through a stateless Cloudflare Worker that forwards end-to-end
  encrypted web pushes.
- [ ] Safe message storage and syncing between your own devices, encrypted at rest with a non-extractable key.
- [ ] Identity backup (exported key or a 12-word phrase), and multiple devices per person.
- [ ] Offline messages ("deliver when they come online"), encrypted.
