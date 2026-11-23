<img src="public/favicon.svg" width="96" height="96" alt="P2P WebRTC Chat logo">

# web-rtc-chat

A chat, call and file-sharing app that runs entirely in the browser. Two people connect **directly to each other**:
there is no server in the middle that sees or keeps your messages.

Live: https://eziomercer.github.io/web-rtc-chat/

## Features

- 💬 **Private chat**, straight from your browser to theirs
- 📞 **Audio and video calls**, with front and back camera
- 🖥️ **Screen sharing**
- 🎙️ **Voice and round video messages**: hold to record, let go to send
- 📎 **Files of any size**: photos, videos, documents
- 📍 **Share your location**, once or live
- 🖼️ **Profile pictures**, seen only by your contacts
- 🔒 **End-to-end encrypted**: no server ever sees your messages
- 👤 **No account**: no phone number, no email, no sign-up
- 💾 **Your chats stay with you**, encrypted on your device
- 📦 **Password-locked backups** to move to a new device
- ➕ **Add a friend in seconds** with a QR code or a link
- ✅ **A safety code of 4 emojis** proves nobody is in the middle
- 🔇 **Echo guard** notices echo in a call and fixes it
- 🔁 **Reconnects by itself** after a network drop
- 📱 **Phones and computers**, nothing to install

## How it works, in simple words

1. **The website is just files.** GitHub Pages serves the HTML, JS and CSS once. It has no backend, database or
   accounts.
2. **Your identity is keys, not an account.** For each contact the app creates a new key pair on your device, so no
   two contacts see the same key and they can't tell they know the same person (unless you set a profile picture:
   everyone gets the same one). There is no sign-up, email, phone
   number or password. You choose how the keys and chats are protected on this device:
   - **passkey:** fingerprint, face or device PIN (recommended);
   - **passphrase;**
   - **no protection;**
   - **temporary:** nothing is saved.
3. **Adding a contact happens once.**
   - You show an invite as a QR code, or send it as a link. It is single-use and expires after 10 minutes.
   - Each invite has a new key for whoever uses it. The link doesn't contain that key, only a hash of it. Your
     friend opens it and sends their new key first; only then does your app reveal yours, and theirs checks it
     against the hash. You accept them.
   - Both screens then show the same **safety code** of 4 emojis. You compare them in person or on a voice call. If
     they match, nobody is in the middle, and you mark the contact as verified.
   - Because each side sends its key before seeing the other's, someone in the middle can't search for a key that
     gives a matching code: they get one blind try, which works 1 time in 4.3 billion. Manual mode shows 6 emojis
     instead, because there that protection is missing.
4. **Finding each other uses Nostr relays.**
   - Browsers can't accept incoming connections, so they need a meeting point. The app uses 4 public
     [Nostr](https://nostr.com/) relays, hardcoded like the STUN server.
   - A relay only passes on the short "here's how to reach me" note needed to start a WebRTC connection.
   - That note is encrypted, signed with your key for that contact and sent from a throwaway key. It goes to a mailbox
     address that changes every day and that only the two of you can compute.
   - The events are *ephemeral*: relays forward them without storing them.
5. **Then the browsers connect directly** using WebRTC:
   - text and files travel over data channels;
   - audio and video travel over media tracks.

   After that, relays aren't involved in that conversation. Every time you connect, the two apps also swap a new
   mailbox secret over the direct link, so an old invite or secret stops working.
7. **Profile pictures go the same way.** Settings → Your picture makes a small square picture (256 px) from any
   photo. Each time a contact connects, your app sends its fingerprint (a hash); only if theirs differs do they ask
   for the picture itself, over the direct link. A new or removed picture reaches connected contacts right away,
   the others when they connect next.
6. **Chats stay on your device.** Messages and files are saved in the browser (IndexedDB), encrypted, and come back
   after a reload. With a temporary identity they live only in the tab's memory, and so does the manual connection's
   chat. The app runs in one tab at a time: a second tab waits until the first is closed.

Some networks block direct connections. Then the browsers send their (still end-to-end encrypted) traffic through
a **TURN relay** on Cloudflare instead. It can't read anything and stores nothing. The status then says "through TURN
relay". While on the relay, video quality is lowered and files (also voice and video messages) can be up to 10 MB,
to save traffic. Every 5 minutes the app looks for a
direct path again and moves to it when it works. During a call this is done with care, because a direct path can
work for a moment only and take the call down with it: the app opens a second, direct-only connection next to the
relay one and tests it for 10 seconds. Only if it holds does the call move over, and the relay connection stays open
(idle) for 30 more seconds: if the direct one breaks in that time, the call goes straight back. If no direct path
works, the call stays on the relay, which gets fresh credentials so a long call doesn't drop. If an open connection loses its path (for example, Wi-Fi drops),
the app searches for a new one right away, direct or through TURN. The request goes through the Nostr relays,
because the broken connection can't carry it. If nothing is found within 15 seconds, it reconnects from scratch.

A **manual mode** is still there (Settings → Connect manually). Two people copy connection codes to each other by
hand, without contacts or relays.

## Why it is safe and private

- **End-to-end encrypted, always.** WebRTC can't send anything unencrypted:
  - data channels use DTLS;
  - audio and video use SRTP.

  The encryption keys are created inside each browser for each connection and never leave it.
- **Nobody can pretend to be your contact.**
  - Every connection request is signed with the sender's key for you, and the app drops anything not signed by the
    contact you saved.
  - The request carries the certificate fingerprint of the direct connection, so a relay can't swap in its own.
  - The safety code proves that the keys are the right ones.
- **Relays see almost nothing.** They see encrypted, throwaway-signed notes addressed to random-looking mailboxes
  that change daily. They don't see who talks to whom, or any content, and they don't store the notes.
- **Messages never touch a server.** No server or relay ever stores (or sees) them. Only your own device keeps
  them, and only encrypted.
  - Saved in IndexedDB: your contact list (names, pictures, both public keys, mailbox secrets), your private key for
    each contact, your settings, your picture, and your chats (messages, files, voice and video messages).
  - All of it is encrypted (AES-GCM) with a random data key. The data key is encrypted with your passkey or
    passphrase key; changing the protection only encrypts the data key again. With "no protection" the key that
    opens it is saved right next to it, so anyone with a copy of the browser's files can read everything.
  - Each saved piece is bound to its place, so pieces can't be swapped around. Files are saved in 1 MB pieces, and
    a saved file is decrypted only when it scrolls into view.
  - Browsers may delete a site's data when the device runs low on space. The app asks the browser to keep it
    ("persistent storage"); installed apps usually get that. Safari on iPhone and iPad deletes the data of sites
    not visited for 7 days, unless the app is added to the Home Screen. Keep a backup.
- **Locations stay between the two of you.** A shared place goes over the direct connection like a message. The
  map in the chat is drawn by the app (made-up streets, no map pictures are loaded), so no map service learns the
  place. Only the app you open it in (or share it to) gets it. Only the latest spot of a live location is kept, not the
  way it went.
- **No accounts, analytics, trackers or third-party scripts.**

## Backups

Settings → Back up writes a `.p2pchat` file with your contacts (and their pictures), your keys for them, your own
picture and your chats. Settings →
Restore (or "Restore from a backup file" on the first screen) brings them back, on this device or another one.

- **You choose what goes in:** text only or with media, for all chats or each chat on its own, and chats to leave
  out. The dialog shows the size and time for each choice. Settings are never in a backup: they belong to the
  device.
- **Locked with its own password.** A random key encrypts the file, and the password (through Argon2id, like the
  passphrase) encrypts that key. It works on any device, whatever protection either device uses. Before a backup,
  the app asks for the passkey or passphrase again, so someone holding your unlocked phone can't take your chats.
- **Nothing can be changed unnoticed.** Every piece of the file is encrypted together with its place in it, and the
  file ends with an end mark. A changed, reordered or cut-off file is refused.
- **Small.** Messages and text-like files are zipped before they are encrypted. Photos, videos and voice are
  compressed already, so they go in as they are.
- **Big backups don't fill the memory.** A small service worker (it handles only this, and caches nothing) streams
  the file to disk piece by piece. Without it, for example in some private windows, the file is built in memory.
- **Offline meanwhile.** While a backup is made or restored, the app stops the relays and closes its connections,
  so nothing changes halfway. Then it reconnects by itself.
- **Restoring adds and replaces.** A chat from the backup replaces the same chat on the device; others are added;
  chats only on the device stay. Your picture comes back from the backup only if the device has none. If a
  different contact here has the same name, you choose: keep this device's, the backup's, or both. A restore is all or nothing: the whole file is checked and written first, and only then
  switched in at once.
- **One device at a time.** A restored device has the same keys as the one the backup came from. There is no
  automatic sync: if both are open, both answer your contacts and the chats split between them.

### What it does *not* protect against

- **Skipping the safety check.** If someone intercepted the invite link and used it first, they could pose as your
  contact. Comparing the safety code catches this, but only if people actually compare it.
- **A weak backup password.** Anyone with the backup file can try passwords offline. Argon2id makes each guess
  slow, but a short password can still be found: use the suggested words.
- **A compromised device.** Malware that can read your screen, keyboard or memory can read anything while the app
  is unlocked. With "no protection", it can also copy your keys from disk. No app can defend against that.
- **IP addresses.** The other person sees your IP address when the connection is direct. Relays, the STUN server
  and the TURN relay see it too, as any website would. Relays can also see *when* your app is online.
- **Availability.** If all 4 relays are down or block the app, contacts can't find each other. The manual mode
  still works.
- **The code you download.** You trust that the files served from GitHub Pages are the ones in this repository.
