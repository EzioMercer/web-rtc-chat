# Notes for Claude

A peer-to-peer chat, call and file app that runs only in the browser (React 19, Redux Toolkit, Vite, TypeScript),
hosted on GitHub Pages at `/web-rtc-chat/`. Browsers connect directly with WebRTC; Nostr relays only carry the
encrypted setup notes; a Cloudflare TURN relay (`worker/`) carries traffic when no direct path exists. README.md
explains the product and its privacy promises; read it before changing anything about what is stored or sent.

## Where things are

```
src/
  ui/         Reusable building blocks. Look here before writing a new button, dialog or field.
                Button, IconButton, Icon (+ paths.ts: every icon), Dialog (dismissible={false} for questions that
                must be answered), TextField, CodeField, CopyButton, SegmentedControl (radio or tabs),
                MediaVideo (plays a MediaStream), QrCode, QrScanner, Logo
  features/   Screens, one folder per feature, with the hooks and helpers only that feature uses.
                app/        Messenger (main layout), Sidebar, EmptyPane, UpdateNotice
                setup/      SetupScreen, UnlockScreen, ProtectionPicker
                settings/   SettingsDialog, LegalDialog (LEGAL.ts: disclaimer and privacy text)
                contacts/   AddContactDialog (invite / join), ContactList, ContactRow, SafetyPanel, dialogs
                chat/       ChatPane, Conversation, ChatHeader, MessageList, Composer, FileBubble
                recording/  voice and round video messages: useRecording (tap/hold/slide logic), RecordButton,
                            RecordingBar, VideoNotePreview, VoiceBubble, VideoNoteBubble
                calls/      CallPanel (controls), CallStage (videos), CallBanner, EchoPrompt, useEchoGuard,
                            useEchoDetector, useCallStats, useCallSounds
                manual/     ManualPane, ManualSetup (connect by copying codes, no relays)
  core/       Engine code with no React in it.
                webrtc/     sessions (state.ts holds the live RTCPeerConnections), data channels, files, routes,
                            config.ts (all timeouts and limits, TURN_FILE_LIMIT), echoConfig.ts
                signaling/  what goes through relays (types.ts), sealing and invite links
                nostr/      relay pool, mailboxes, listen/publish
                identity/   keys, the encrypted vault, saving contacts and settings
                crypto/     small WebCrypto helpers
                storage/    kv.ts: the ONLY module allowed to touch browser storage (lint enforces it)
                turn/, update/  the only modules allowed to fetch (lint enforces it)
                media/      recording engine (MediaRecorder, format choice, square crop, waveform)
                compression/  zip/unzip (deflate-raw) for files, relay notes and manual codes
                sound/      ringtone (Web Audio, paused when nothing rings: see the comment there)
  store/      Redux: one folder per slice (app, contacts, sessions, chat, call, invites, manual, ui, settings),
              thunks/<area>/ for everything with side effects, persistence.ts saves contacts and settings.
  hooks/      Generic hooks (useElapsed, useFullScreen, useDragSort). Feature hooks live in their feature.
  utils/      Generic helpers (cx, formatBytes, formatDuration, hasKeyboard, trackWindowHeight).
```

Imports are relative (`../../ui/Button/Button.tsx`), with the file extension.

## How the main flows work

- **Start:** `App` → `initApp` thunk → setup, unlock or (no protection) straight in → `afterUnlock` starts
  listening on the Nostr mailboxes.
- **Connecting to a contact:** `connectContact` creates a session (`core/webrtc/createSession.ts`), sends a sealed,
  signed offer to the contact's daily mailbox (`core/signaling`, `core/nostr`); `receiveOffer` / `receiveAnswer`
  answer it. Once the data channel opens, `sessionOpened` checks the route (direct or TURN) and starts
  `watchPaths`, which moves to a better path or rescues a broken one.
- **Chat text** goes over the `control` data channel as JSON (`ControlMessage` in `core/webrtc/types.ts`), with
  an ack. **Files** each get their own data channel (`sendFile` / `receiveFile`); text-like files are zipped
  first (`core/compression/packFile.ts`, `packed` in the file's first message). Over TURN only files up to
  `TURN_FILE_LIMIT` (10 MB, counted zipped) go, checked on both sides.
- **Zipping** (`core/compression`, the browser's own deflate-raw): files as above, the notes sent through relays
  (`sealEnvelope` / `openEnvelope`) and the manual codes. Always before encrypting; unzipping is size-capped.
  Chat text is not zipped: it is too short to gain anything.
- **Calls** use media tracks on the same connection; call control (`invite`, `accept`, `state`, `echo`, …) goes
  over the control channel and is handled in `store/thunks/call/receiveCallSignal.ts`.
- **Voice/video messages** are files with a `note` (type, duration, waveform) in their first message.
- **Echo guard:** the side that hears its own voice back (`useEchoDetector`) sends `echo`; the other side is asked
  (`EchoPrompt`) and its `useEchoGuard` turns the microphone off while they talk. Both only read
  `getStats()` levels: no Web Audio during calls (it breaks phones' echo filters).
- **Nothing a user writes is ever stored.** Only the identity, contacts and device settings are saved, encrypted
  (`core/identity`). Settings are per device: never synced, never in backups.

## Code style (lint enforces most of it: run `npx eslint .` and `npx tsc --noEmit`)

- Arrow functions only, one exported function or component per file, named like the file.
- Comments in plain English that say why; no "removed" or history comments.
- Constants and limits go in the area's `config.ts` with a comment.
- Enums, not string-literal unions; number enums by default. String enums only where the value is itself a
  CSS class name or a browser/HTML value (ButtonVariant, IconButtonVariant, MessageAuthor, TrackKind, …). Never
  `const enum` (isolatedModules). Enum values in text (logs, file names) must be turned into words
  (e.g. `CallAction[action]`), and CSS classes picked through a lookup table, never `styles[numericEnum]`.
  Data saved before November 2026 used words: `toProtectionMode` and `loadSettings` still read those.
- New UI: reuse `ui/` first. Something used by two features belongs in `ui/`, `hooks/` or `utils/`.
- Git hooks run eslint --fix and tsc on commit.

## Testing

- `npm run build` must pass. There is no unit test runner.
- `scripts/e2e-media.mjs`: two browsers connect by hand-copied codes and test voice/video messages, the TURN
  limit, zipped files and echo detection with the guard. It imports the app's modules in the page, so it needs the dev server:
  `VITE_TURN_URL= npx vite --port 5173 --strictPort &` then `node scripts/e2e-media.mjs`.
- `scripts/e2e-real-relays.mjs` (built app, real relays), `scripts/check-turn.mjs`, `scripts/check-relays.mjs`.
- Scripts import `playwright`. In the cloud container it is preinstalled outside the project: link it with
  `ln -sfn /opt/node-tools/node_modules/playwright node_modules/playwright` (never run `playwright install`).
- Tricks: `--use-fake-device-for-media-stream` and `--use-file-for-fake-audio-capture=x.wav` for a fake
  camera/microphone; in the dev server, `await import('/web-rtc-chat/src/core/webrtc/state.ts')` from
  `page.evaluate` reaches the live sessions (e.g. set `session.route = 'relay'` to test the TURN limit).

## Working with the owner

- Simple words, short answers, one step at a time. When they only ask a question, answer it and wait; don't
  start changing code.
- Commit and push on `master` only, as EzioMercer, unsigned, with no Co-Authored-By or other attribution.
- Keep README.md (features, privacy), the legal text (`features/settings/LegalDialog/LEGAL.ts`) and TODO.md true
  when behaviour changes.
