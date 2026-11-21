<img src="public/favicon.svg" width="96" height="96" alt="P2P WebRTC Chat logo">

# web-rtc-chat

A chat, call and file-sharing app that runs entirely in the browser. Two people connect **directly to each other**:
there is no server in the middle that sees or keeps your messages.

Live: https://eziomercer.github.io/web-rtc-chat/

## Features

- 💬 Private chat, straight from one browser to another
- 📞 Audio and video calls
- 🖥️ Screen sharing
- 🎙️ Voice messages and round video messages: tap the button to switch, hold to record, let go to send
- 📎 Files, photos and videos of any size (up to 10 MB when the connection goes through the TURN relay)
- 🔒 End-to-end encrypted, messages are never stored
- 👤 No account, phone number or email
- 📱 Works on phones and computers, nothing to install
- ➕ Add contacts with a QR code or an invite link
- ✅ Safety words to check nobody is in the middle
- 🔁 Survives short network drops and reconnects by itself

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

Some networks block direct connections. Then the browsers send their (still end-to-end encrypted) traffic through
a **TURN relay** on Cloudflare instead. It can't read anything and stores nothing. The status then says "through TURN
relay". While on the relay, video quality is lowered and files (also voice and video messages) can be up to 10 MB,
to save traffic. Every 5 minutes the app looks for a
direct path again and moves to it when it works. If an open connection loses its path (for example, Wi-Fi drops),
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
  - Every connection request is signed with the sender's identity key, and the app drops anything not signed by the
    contact you saved.
  - The request carries the certificate fingerprint of the direct connection, so a relay can't swap in its own.
  - The safety words prove that the identity keys are the right ones.
- **Relays see almost nothing.** They see encrypted, throwaway-signed notes addressed to random-looking mailboxes
  that change daily. They don't see who talks to whom, or any content, and they don't store the notes.
- **Messages are never stored.** Not on a server, a relay, or your device.
  - The only things saved, in IndexedDB, are your identity key and your contact list (names, public keys, mailbox
    secrets). They are encrypted with your passkey or passphrase key.
- **No accounts, analytics, trackers or third-party scripts.**

### What it does *not* protect against

- **Skipping the safety check.** If someone intercepted the invite link and used it first, they could pose as your
  contact. Comparing the safety words catches this, but only if people actually compare them.
- **A compromised device.** Malware that can read your screen, keyboard or memory can read anything while the app
  is unlocked. With "no protection", it can also copy your identity key from disk. No app can defend against that.
- **IP addresses.** The other person sees your IP address when the connection is direct. Relays, the STUN server
  and the TURN relay see it too, as any website would. Relays can also see *when* your app is online.
- **Availability.** If all 4 relays are down or block the app, contacts can't find each other. The manual mode
  still works.
- **The code you download.** You trust that the files served from GitHub Pages are the ones in this repository.
