# web-rtc-chat

A chat, call and file-sharing app that runs entirely in the browser. Two people connect **directly to each other**:
there is no server in the middle that sees or keeps your messages.

Live: https://eziomercer.github.io/web-rtc-chat/

## How it works, in simple words

1. **The website is just files.** GitHub Pages serves the HTML, JS and CSS once. It has no backend, database or
   accounts.
2. **Your identity is a key, not an account.** On first launch the app creates a key pair on your device. There is
   no sign-up, email, phone number or password. You choose how the key is protected on this device:
   - **passkey:** fingerprint, face or device PIN (recommended);
   - **passphrase;**
   - **no protection;**
   - **temporary:** nothing is saved.
3. **Adding a contact happens once.**
   - You show an invite as a QR code, or send it as a link. It is single-use and expires after 10 minutes.
   - Your friend opens it, and you accept them.
   - Both screens then show the same 4 **safety words**. You compare them in person or on a voice call. If they
     match, nobody is in the middle, and you mark the contact as verified.
4. **Finding each other uses Nostr relays.**
   - Browsers can't accept incoming connections, so they need a meeting point. The app uses 4 public
     [Nostr](https://nostr.com/) relays, hardcoded like the STUN server.
   - A relay only passes on the short "here's how to reach me" note needed to start a WebRTC connection.
   - That note is encrypted, signed with your identity key and sent from a throwaway key. It goes to a mailbox
     address that changes every day and that only the two of you can compute.
   - The events are *ephemeral*: relays forward them without storing them.
5. **Then the browsers connect directly** using WebRTC:
   - text and files travel over data channels;
   - audio and video travel over media tracks.

   After that, relays aren't involved in that conversation. Every time you connect, the two apps also swap a new
   mailbox secret over the direct link, so an old invite or secret stops working.
6. **Closing the tab ends everything.** Messages and received files exist only in the page's memory (the Redux
   store), and they disappear when the tab closes.

A **manual mode** is still there (Settings → Connect manually). Two people copy connection codes to each other by
hand, without contacts or relays.

## Why it is safe and private

- **End-to-end encrypted, always.** WebRTC can't send anything unencrypted:
  - data channels use DTLS;
  - audio and video use SRTP.

  The encryption keys are created inside each browser for each connection and never leave it.
- **Nobody can pretend to be your contact.**
  - Every connection request is signed with the sender's identity key, and the app drops anything not signed by the
    contact you saved.
  - The request carries the certificate fingerprint of the direct connection, so a relay can't swap in its own.
  - The safety words prove that the identity keys are the right ones.
- **Relays see almost nothing.** They see encrypted, throwaway-signed notes addressed to random-looking mailboxes
  that change daily. They don't see who talks to whom, or any content, and they don't store the notes.
- **Messages are never stored.** Not on a server, a relay, or your device.
  - The only things saved, in IndexedDB, are your identity key and your contact list (names, public keys, mailbox
    secrets). They are encrypted with your passkey or passphrase key.
  - An ESLint rule bans every storage and network API (`localStorage`, `indexedDB`, `fetch`, `WebSocket`,
    `sendBeacon`, cookies, …) outside `src/storage/`, so this can't break by accident.
- **No accounts, analytics, trackers or third-party scripts.**

### What it does *not* protect against (be honest with users)

- **Skipping the safety check.** If someone intercepted the invite link and used it first, they could pose as your
  contact. Comparing the safety words catches this, but only if people actually compare them.
- **A compromised device.** Malware that can read your screen, keyboard or memory can read anything while the app
  is unlocked. With "no protection", it can also copy your identity key from disk. No app can defend against that.
- **IP addresses.** The other person sees your IP address, because the connection is direct. Relays and the STUN
  server see it too, as any website would. Relays can also see *when* your app is online.
- **Availability.** If all 4 relays are down or block the app, contacts can't find each other. The manual mode
  still works.
- **The code you download.** You trust that the files served from GitHub Pages are the ones in this repository.

## Run it locally

Requires Node.js `^20.19 || ^22.13 || >=24`.

```sh
npm install      # also installs the git hooks
npm run dev      # dev server with hot reload
npm run build    # typecheck + production build into dist/
npm run lint     # ESLint, which also checks formatting
```

To test against your own relays, set `VITE_RELAYS` (comma-separated) when building or starting the dev server,
e.g. `VITE_RELAYS=ws://localhost:7777 npm run dev`.

Every push to `master` builds the site and deploys it to GitHub Pages (`.github/workflows/deploy.yml`).

## Code layout

| Folder | What it does |
|---|---|
| `src/identity/` | Identity key and the 4 protection modes (passkey PRF, Argon2id passphrase, device key, temporary) |
| `src/storage/` | The only module allowed to touch browser storage |
| `src/crypto/` | Small WebCrypto helpers (AES-GCM, HKDF, SHA-256, base64, safety words) |
| `src/nostr/` | Relay pool, daily mailboxes, encrypted publishing and listening |
| `src/signaling/` | Signed envelopes, invites, who is polite in a pair |
| `src/webrtc/` | One connection per contact, files, calls, perfect negotiation |
| `src/store/` | Redux slices and thunks |
| `src/components/` | React components, each with its own CSS module |

See [TODO.md](TODO.md) for what's done and what's next.
