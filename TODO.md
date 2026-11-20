# TODO

The goal is messenger-like access: tap a contact to chat or call, with no copy-pasting of codes. Everything stays
peer-to-peer and nothing is stored on any server.

## 📌 Pinned: safety code check

Done first; every later step relies on it.

- [x] Compute a short safety code (4 words) by sorting two keys, SHA-256-ing them, and mapping the first bytes to
  words:
  - **contacts:** from both identity keys. It stays the same for the whole contact, so it is compared once. Every
    offer/answer (which carries the DTLS fingerprint) is signed by the identity key, so this also covers the DTLS
    connection;
  - **manual connections:** from the `a=fingerprint` lines of both descriptions, as originally planned.
- [x] Show the safety code from the chat header. It opens on its own for unverified contacts, so a new contact sees
  it right after adding.
- [x] Add a "Mark as verified" action and show a verified badge on the contact.
- [x] Warn loudly if a verified contact's identity key ever changes (re-adding someone as "<name>, with a new
  device" resets verification and posts a warning in the chat).
- [x] Explain the check to users in one sentence: "Compare these with your friend in person or by voice. If they
  differ, someone is in the middle."

## Phase 1: Identity

Goal: nobody who copies the device's files can send messages as you.

- [x] On first launch, generate a long-term identity key pair with WebCrypto. It uses ECDSA P-256, because every
  browser supports it; Ed25519 isn't everywhere yet.
- [x] No sign-up, email, phone number or password.
- [x] Never send the identity key to a relay as-is. Relays only ever see throwaway Nostr keys (see Phase 3).
- [x] At first launch, the user picks how the identity and contact list are protected. They can switch later in
  settings; switching only re-encrypts, so contacts notice nothing.
  1. **Passkey (recommended, preselected):**
     - fingerprint, face or device PIN;
     - the passkey's PRF extension gives a stable secret;
     - that secret derives (HKDF) an AES-GCM key, which encrypts the identity key and the contact list in IndexedDB;
     - the passkey is tied to the `eziomercer.github.io` domain;
     - check PRF support at setup, and if it's missing, preselect the passphrase instead.
  2. **Passphrase:**
     - Argon2id (vetted WASM library) turns the passphrase into an AES-GCM key;
     - suggest a generated 4–5 word passphrase, and warn if a weak one is chosen.
  3. **No protection:**
     - a non-extractable AES key stored as-is in IndexedDB encrypts the identity, so switching to another
       protection later still works;
     - show a clear warning: "Anyone with access to this device's files could send messages as you."
  4. **Temporary:**
     - nothing is saved, and identity and contacts disappear when the tab closes;
     - meant for shared or untrusted computers.
- [x] Unlock screen on every app open, for options 1 and 2. After unlocking:
  - the identity key lives in memory only, as a non-extractable `CryptoKey`;
  - it's dropped when the tab closes.
- [x] Explain the trade-offs in the setup screen, in simple words:
  - losing a device-only passkey or forgetting the passphrase means a new identity, and contacts must re-add and
    re-verify you;
  - while the app is unlocked, malware on the device could still misuse it.
- [x] Encrypted identity backup and restore, so a new device can unlock it with the passphrase or a synced passkey.
- [x] Losing a device: contacts re-add you in person or by invite link, and the "identity key changed" warning from
  the pinned item tells them what happened.

## Phase 2: Adding contacts

- [x] **In person, by QR code:**
  - the QR contains the public identity key and a one-time invite secret;
  - the friend scans it;
  - the "add me" request goes through Nostr;
  - both screens then show the safety code to compare.
- [x] **Remotely, by invite link:** single-use, expires after 10 minutes, then confirmed with the safety code over an
  in-app voice call.
- [x] Contact list: name (chosen locally), public identity key, mailbox secret, verified flag. Saved in IndexedDB on
  this device only.
- [x] QR scanning works both with the phone's own camera app (the QR is the invite link) and in the app
  ("I have an invite" → "Scan their QR code").
- [x] If the same invite is used twice, the second request is ignored.
- [ ] Later: a short spoken code (for example `4-tiger-violin-moon`), using a vetted protocol that turns a short
  password into a strong key (PAKE).

## Phase 3: Finding each other through Nostr

- [x] Add `nostr-tools`.
- [x] Hardcode 4 public relays in the config, like the STUN server, the same for everyone. Connect to all of them
  in parallel.
- [x] One shared WebSocket per relay for the whole app, not per contact:
  - all mailbox tags go in one subscription filter;
  - each signaling event is published to every relay;
  - incoming duplicates are dropped by event id.
- [x] Use ephemeral events (kinds 20000–29999), which relays forward without storing.
- [x] Encrypt every payload (NIP-44) and also sign it with the identity key.
- [x] Use a fresh throwaway Nostr key for every connection attempt.
- [x] Use a per-contact mailbox computed as HKDF(shared secret, recipient, date):
  - it's used as a Nostr public key in the `p` tag;
  - it changes daily and differs per direction;
  - relays can't link it to people.
- [x] Addresses found after the offer/answer went out also go through Nostr until the direct connection opens
  (some networks take half a minute to find them all).
- [x] When both sides send offers at once, the polite side (decided by the identity keys) gives way, and the other
  side sends its offer again.
- [x] Ignore anything not signed by a known contact. Reject replays with a timestamp and nonce.
- [x] Don't publish presence. "Is my friend online?" is asked only when the user opens that contact.
- [x] Run the existing WebRTC offer/answer/ICE exchange over Nostr instead of copy-paste.
- [x] Stay subscribed to our own mailboxes while the app is open, so contacts can reach us.
- [x] Keep manual copy-paste codes as a hidden "connect manually" fallback.

## Phase 4: Rotating addresses after connecting

- [x] After the first direct connection, exchange a new mailbox secret over the encrypted data channel, never over a
  relay.
- [x] Rotate in two steps: send "new secret", wait for "ack", then retire the old one, so neither side gets lost if
  it goes offline mid-swap.
- [x] Retire the invite after use, so a copied invite is worthless.

## Phase 5: UI rewrite

- [x] **Desktop:** two panes, like other chat apps.
  - **Left:** the contact list, always visible.
  - **Right:** the conversation with the selected contact.
- [x] **Phone:** messenger-style.
  - The contact list fills the screen.
  - Opening a contact shows the chat full screen.
  - A back button returns to the list; the browser/system back gesture does the same.
- [x] Contact list rows show:
  - the name;
  - status (online / connecting / offline);
  - the verified mark;
  - the unread count, shown only when there is at least one unread message.

  No message preview or last message.
- [x] Contact management:
  - **Rename:** the name is chosen locally and only you see it.
  - **Delete:** with a confirmation.
  - **Reorder:** drag and drop on desktop, long-press and drag on phones.
  - **Favourite:** favourites stay pinned in their own group at the top of the list, and can be reordered within it.
- [x] "Add contact" button at the top of the list, with QR and invite-link options.
- [x] Right pane: the existing chat header, call panel, message list and composer, for the selected contact.
- [x] Empty states: no contacts yet, and no contact selected.
- [x] Our invite QR and link are under "Add contact". There's no permanent contact QR, because invites are
  single-use.
- [x] Settings: protection, backup, lock, relay status, connect manually, delete identity.
- [x] Code changes:
  - one `RTCPeerConnection` per contact, replacing the `rtc` singleton with a map keyed by contact;
  - a per-contact connection state and message list in Redux;
  - only one call at a time across all contacts.

## Phase 6: Messages stay in memory only

Hard requirement: message text and files are never written to disk, a server, a relay or browser storage.

- [x] Messages and received files live only in Redux memory. They're gone when the tab closes, as they are today.
- [x] Only signaling (offers, answers, ICE candidates) goes over Nostr, never message content.
- [x] Revoke the object URLs of received files when a conversation is cleared or the app closes.
- [x] Never log message content to the console.
- [x] No analytics, trackers or third-party scripts.
- [x] Enforce this with ESLint:
  - ban `localStorage`, `sessionStorage`, `indexedDB`, `caches`, `document.cookie`, `fetch`, `XMLHttpRequest`,
    `WebSocket` and `sendBeacon` everywhere;
  - allow them only in `src/storage/` (IndexedDB). The Nostr module needs no exception, because `nostr-tools`
    opens the WebSockets;
  - also `no-console` except `error`/`warn`.
- [x] Add a "Clear conversation" action (in the contact's menu).
- [x] Redux DevTools are disabled in production, so browser extensions can't read the store.

## Phase 7: Reliability

- [x] Reconnect automatically after a drop, or when the network comes back. This makes a fresh connection over
  Nostr (3 tries at 2s, 5s and 15s) rather than an ICE restart.
- [x] While a contact's chat is open and they're offline, check again every 20 seconds.
- [x] Optional TURN server (Cloudflare) for strict networks. This also hides the IP address from the peer.
  - [x] Worker that hands out short-lived credentials (`worker/`), and the app side (`VITE_TURN_URL`).
  - [x] Show "through TURN relay" when a connection uses it.
  - [x] Deploy the Worker.
  - [x] Stop handing out credentials at 800 GB in 31 days (longer than any billing month), so the free 1,000 GB is never exceeded.
  - [x] Renew credentials of a running TURN connection before they expire (1 hour): new credentials and a new path
    search every 5 minutes while on the relay.
  - [x] Move from the relay to a direct connection when one starts working (the same path search).
  - [x] Lower video quality on TURN calls to save traffic (500 kbit/s).
- [ ] Test with the real public relays: the 4 hardcoded relays must accept ephemeral events of kind 20784.
- [x] Handle relays that are down or slow: publish to all relays, and succeed when any one accepts.
- [x] Reconnect to a dropped relay automatically: the pool backs off, and every 30 seconds relays that never
  connected are retried.

## Later (not planned yet)

- [ ] Push notifications when the tab is closed, through a stateless Cloudflare Worker that forwards end-to-end
  encrypted web pushes.
- [ ] Safe message storage and syncing between your own devices, encrypted at rest with a non-extractable key.
- [ ] Multiple devices per person.
- [ ] Offline messages ("deliver when they come online"), encrypted.
- [ ] A longer relay list with fallback when relays die. It must be the same, in the same order, for everyone, so peers
  still meet on the same relays. Possibly fetched from a source we control, such as a file in this repo.

## Calls and messages (done)

- [x] Ringtone for incoming calls and a ringback tone while calling (Web Audio, no files).
- [x] Answer a video call with audio only.
- [x] Delivery confirmation: each message waits for an "ack"; unconfirmed ones are sent again when the connection
  reopens (duplicates are ignored). Messages typed while the contact is offline go out when they come online.
- [x] Voice gets priority over video on a busy network; the call shows when much of their audio is lost.
- [x] Full screen for video calls; drag the own-camera preview anywhere over their video.
- [x] Say when a new version is out (version.json, checked every 30 minutes); reloading stays optional.
