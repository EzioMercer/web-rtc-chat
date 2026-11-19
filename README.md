# web-rtc-chat

A chat, call and file-sharing app that runs entirely in the browser. Two people connect **directly to each other**:
there is no server in the middle that sees or keeps your messages.

Live: https://eziomercer.github.io/web-rtc-chat/

## How it works, in simple words

1. **The website is just files.** GitHub Pages serves the HTML, JS and CSS once. After that, the site is never
   contacted again. It has no backend, database or accounts.
2. **Two browsers introduce themselves.** To connect directly, each browser has to tell the other "here's how to
   reach me and here's my certificate fingerprint". Today this note (the *code*) is copied by hand:
   - Person A presses **Host** and sends their code to B.
   - B pastes it, presses **Join**, and sends their code back.
   - A pastes it and presses **Connect**.

   See [TODO.md](TODO.md) for the plan to replace this with tap-a-contact.
3. **The browsers connect directly** using WebRTC, the same technology video-call apps use:
   - text and files travel over WebRTC *data channels*;
   - audio and video travel over WebRTC media tracks.
4. **Everything after that goes over the direct link.** Starting a call, turning the camera on, and sending a file
   all happen without exchanging codes again. This uses the
   [perfect negotiation](https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API/Perfect_negotiation) pattern.
5. **Closing the tab ends everything.** Messages and received files are kept only in the page's memory (the Redux
   store), and they disappear when the tab closes.

The only outside server involved is a public STUN server (Google's). It answers a single question, "what is my
public IP address?", so the browsers can find a way to each other. It never sees any message.

## Why it is safe and private

- **End-to-end encrypted, always.** WebRTC can't send anything unencrypted:
  - data channels use DTLS;
  - audio and video use SRTP.

  The encryption keys are created inside each browser for each connection, and they never leave it. They also
  aren't in the codes you copy. The codes only contain addresses and a certificate fingerprint.
- **No server sees the content.** Messages go straight from one browser to the other. Nothing passes through a
  server that could read, log or keep them.
- **Nothing is stored.** The app doesn't use `localStorage`, `sessionStorage`, IndexedDB, cookies or caches for
  messages. It has no analytics or trackers, and no third-party scripts.
- **No accounts.** No email, phone number, username or password, so there is nothing to leak.

### What it does *not* protect against (be honest with users)

- **A swapped code.** If someone replaces the code in transit (a compromised messenger, or malware that rewrites the
  clipboard), they can sit in the middle and read everything. The planned safety code check (📌 in
  [TODO.md](TODO.md)) detects this: both screens show the same short code only when nobody is in the middle.
- **A compromised device.** Malware that can read your screen, keyboard or memory can read anything. No app can
  defend against that.
- **IP addresses.** The other person sees your IP address, because the connection is direct. The STUN server sees
  it too, as any website would.
- **The code you download.** You trust that the files served from GitHub Pages are the ones in this repository.

## Run it locally

Requires Node.js `^20.19 || ^22.13 || >=24`.

```sh
npm install      # also installs the git hooks
npm run dev      # dev server with hot reload
npm run build    # typecheck + production build into dist/
npm run lint     # ESLint, which also checks formatting
```

Every push to `master` builds the site and deploys it to GitHub Pages (`.github/workflows/deploy.yml`).
