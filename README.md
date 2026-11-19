# web-rtc-chat

Serverless peer-to-peer chat over a WebRTC data channel, built with React, Redux Toolkit, TypeScript and Vite.
Peers exchange connection codes by hand (copy/paste), so no signaling server is needed.

## How to connect

1. **Host:** leave *Peer's code* empty and press **Host**. Send *Your code* to the peer.
2. **Client:** paste the host's code into *Peer's code* and press **Join**. Send *Your code* back to the host.
3. **Host:** paste the client's code into *Peer's code* and press **Connect**. The chat opens on both sides.

## Features

- **Text chat** over a WebRTC data channel.
- **Audio and video calls**: the call buttons are in the chat header. While in a call you can mute the microphone, turn the camera off, and hang up. The peer sees when you are muted or have the camera off.
- **Files and media**: attach with the paperclip, drag and drop onto the chat, or paste (e.g. a screenshot). Images, video and audio are previewed inline; every file can be downloaded. Each file goes over its own data channel in 16 KB chunks with flow control, and shows a progress bar.

The codes are only exchanged once. Everything after that (starting a call, renegotiating media) is signaled through the open data channel using the [perfect negotiation](https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API/Perfect_negotiation) pattern.

Calls need a secure context (HTTPS or `localhost`) for camera and microphone access.

## Development

Requires Node.js `^20.19 || ^22.13 || >=24`.

```sh
npm install      # also installs the git hooks (husky)
npm run dev      # dev server with hot reload
npm run build    # typecheck + production build into dist/
npm run preview  # serve the production build locally
npm run lint     # ESLint (correctness + formatting via @stylistic)
npm run lint:fix # ESLint with autofix, which also formats the code
npm run typecheck
```

A husky `pre-commit` hook runs `eslint --fix` on staged files (lint-staged), then `typecheck` on the whole project. The commit is blocked if either fails.

There is no Prettier. Formatting comes from `@stylistic/eslint-plugin` rules in `eslint.config.js`.

## Deployment

Every push to `master` triggers `.github/workflows/deploy.yml`, which builds the project and publishes `dist/` to GitHub Pages.
In the repo settings, **Pages → Build and deployment → Source** must be set to **GitHub Actions**.

## Code layout

```
src/
  main.tsx, App.tsx      entry point and root component
  components/<Name>/     React components, each with its own CSS module
  store/                 Redux store, slices (connection, chat) and thunks
  webrtc/                RTCPeerConnection / data channel helpers (kept out of the store: not serializable)
  utils/                 pure helpers that derive UI text and state
  styles/global.css      design tokens and base styles
```

Each file exports at most one function, named like the file (`webrtc/decodeCode.ts` exports `decodeCode`).
