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
                must be answered), ConfirmDialog (a yes/no question: never the browser's confirm/alert/prompt),
                TextField, CodeField, CopyButton, SegmentedControl (radio or tabs), Checkbox,
                MediaVideo (plays a MediaStream), QrCode, QrScanner, Logo, Avatar (a picture, letter or icon)
  features/   Screens, one folder per feature, with the hooks and helpers only that feature uses.
                app/        Messenger (main layout), Sidebar, EmptyPane, UpdateNotice, OtherTabScreen
                setup/      SetupScreen, UnlockScreen, ProtectionPicker
                settings/   SettingsDialog, ProfileRow -> ProfileDialog (loaded when opened: PictureSection, InfoSection
                            with PhoneField and CountryDialog), StorageSection, LegalDialog (LEGAL.ts: disclaimer and
                            privacy text)
                backup/     ExportDialog, ImportDialog, BackupProgress (covers the app while one runs)
                contacts/   AddContactDialog (invite / join), ContactList, ContactRow, SafetyPanel, dialogs
                chat/       ChatPane, Conversation, ChatHeader, MessageList, Composer, FileBubble
                recording/  voice and round video messages: useRecording (tap/hold/slide logic), RecordButton,
                            RecordingBar, VideoNotePreview, VoiceBubble, VideoNoteBubble
                calls/      CallPanel (controls), CallStage (videos), CallBanner, EchoPrompt, useEchoGuard,
                            useEchoDetector, useCallStats, useCallSounds
                manual/     ManualPane, ManualSetup (connect by copying codes, no relays)
                location/   LocationBubble (one-time and live; a Google Maps link, a tap opens it the device's way:
                            geo: on Android, OpenWithDialog on Apple devices), LocationDialog (find
                            and send), LocationMap (a drawn map: made-up streets from a seed, no map pictures loaded)
  core/       Engine code with no React in it.
                webrtc/     sessions (state.ts holds the live RTCPeerConnections), data channels, files, routes,
                            config.ts (all timeouts and limits, TURN_FILE_LIMIT), echoConfig.ts
                signaling/  what goes through relays (types.ts), sealing and invite links
                nostr/      relay pool, mailboxes, listen/publish
                identity/   keys, the encrypted vault (a data key under the protection's key), contacts, settings
                history/    saved chats: pages of messages and files in 1 MB pieces, under a random slot per chat
                            (historyKeys), historySaver (debounced, one queue), memoryFiles (this session's files)
                backup/     the .p2pchat file: createBackupWriter / createRecordReader, writeBackup, restoreBackup,
                            openStreamDownload (+ public/backup-sw.js, which streams it to disk)
                tab/        claimTab: one tab at a time (Web Locks)
                crypto/     small WebCrypto helpers
                storage/    kv.ts: the ONLY module allowed to touch browser storage (lint enforces it), with batch
                            (all-or-nothing) writes and prefix reads/deletes
                turn/, update/  the only modules allowed to fetch (lint enforces it)
                media/      recording engine (MediaRecorder, format choice, square crop, waveform)
                compression/  zip/unzip (deflate-raw) for files, relay notes and manual codes
                profile/    our profile: makePicture (photo -> 256 px JPEG data URL), isPicture, isPhone, isAbout,
                            profileHash / infoHash; phone/ (only in ProfileDialog's chunk): libphonenumber-js/mobile
                            checks and spacing, country-flag-icons flags, guessCountry (time zone, then language;
                            TIMEZONE_COUNTRIES is made by scripts/make-timezones.mjs)
                location/   finding the place (findPosition), distanceMeters, the links (googleMapsUrl, appleMapsUrl,
                            geoUrl: built when shown, never saved), config.ts (live durations, how often a live
                            location is sent), liveWatches
                sound/      ringtone (Web Audio, paused when nothing rings: see the comment there)
  store/      Redux: one folder per slice (app, contacts, sessions, chat, call, invites, manual, ui, settings,
              profile, backup), thunks/<area>/ for everything with side effects, persistence.ts saves contacts, settings,
              chats, files and unread counts as they change.
  hooks/      Generic hooks (useElapsed, useFullScreen, useDragSort). Feature hooks live in their feature.
  utils/      Generic helpers (cx, formatBytes, formatDuration, hasKeyboard, trackWindowHeight).
```

Imports are relative (`../../ui/Button/Button.tsx`), with the file extension.

## How the main flows work

- **Start:** `App` → `initApp` thunk → `claimTab` (a second tab waits) → setup, unlock or (no protection) straight
  in → `loadSavedChats` → `afterUnlock` starts listening on the Nostr mailboxes.
- **Connecting to a contact:** `connectContact` creates a session (`core/webrtc/createSession.ts`), sends a sealed,
  signed offer to the contact's daily mailbox (`core/signaling`, `core/nostr`); `receiveOffer` / `receiveAnswer`
  answer it. Once the data channel opens, `sessionOpened` checks the route (direct or TURN) and starts
  `watchPaths`, which moves to a better path or rescues a broken one.
- **Moving a call off TURN** (`store/thunks/move`): during a call, a direct path isn't searched on the call's own
  connection (it could drop the call). The impolite side opens a second, direct-only connection (`createMoveLink`),
  tests it, then the call's tracks, control channel and remote stream move to it (`swapLink`; the session object
  stays, so code that reads `session.peer` follows). The old connection stays idle for a while to go back to
  (`moveBack`). `wirePeer` handles both connections' events: only `session.peer` acts on the session.
- **Chat text** goes over the `control` data channel as JSON (`ControlMessage` in `core/webrtc/types.ts`), with
  an ack. **Files** each get their own data channel (`sendFile` / `receiveFile`); text-like files are zipped
  first (`core/compression/packFile.ts`, `packed` in the file's first message). Over TURN only files up to
  `TURN_FILE_LIMIT` (10 MB, counted zipped) go, checked on both sides.
- **Zipping** (`core/compression`, the browser's own deflate-raw): files as above, the notes sent through relays
  (`sealEnvelope` / `openEnvelope`) and the manual codes. Always before encrypting; unzipping is size-capped.
  Chat text is not zipped: it is too short to gain anything.
- **Calls** use media tracks on the same connection; call control (`invite`, `accept`, `state`, `echo`, …) goes
  over the control channel and is handled in `store/thunks/call/receiveCallSignal.ts`. Switching cameras replaces
  the track on the senders (`replaceCamera`, no new offer); turning the camera on after an audio-only answer
  (`startCamera`) adds a track, which sends a new offer.
- **Route shown** (`checkRoute`): through TURN if either end of the selected path is the relay. Their relay address
  can look ordinary to us ("prflx"), so each side tells the other about its own end (`ControlType.Route`).
- **Profile** (`store/thunks/profile`): ours (picture, phone as "+994501234567", description) is in the `profile`
  slice, saved like the settings but put in backups (Info record). When a contact's connection opens, or we change
  ours, we send two hashes (`ControlType.Profile`): the picture's, and the phone and description's together. For each
  that differs they ask by that hash (`ProfileAsk`) and we send that part. Theirs is `Contact.picture` / `phone` /
  `about`.
- **Locations** (`store/thunks/location`): a `Location` message, sent like a text (`ControlType.Location`, acked,
  resent by `sendPending`). A live one keeps its id: each move, stop or heartbeat sends its whole latest state with
  a higher `rev` and the time left (`live`, ms, so clocks needn't agree); the ack carries the `rev`. Ours follows
  `watchPosition` (`startLiveLocation`) while the app is open; after a reload it ends (`fromStored`).
- **Voice/video messages** are files with a `note` (type, duration, waveform) in their first message.
- **Echo guard:** the side that hears its own voice back (`useEchoDetector`) sends `echo`; the other side is asked
  (`EchoPrompt`) and its `useEchoGuard` turns the microphone off while they talk. Both only read
  `getStats()` levels: no Web Audio during calls (it breaks phones' echo filters).
- **Nothing a user writes is ever stored on a server or relay.** The device may store anything the app needs,
  encrypted with the vault key (`core/identity`, through `core/storage/kv.ts`): the contacts, our key for each
  contact, device settings, and the chats (`core/history`: messages, files, unread counts). Temporary identities
  and the manual connection save nothing. Settings are per device: never synced, never in backups.
- **Vault key:** `vault.vaultKey` is a random data key; `StoredMeta.dataKey` keeps it encrypted with the passkey,
  passphrase or device key. Changing protection only re-encrypts that (`changeProtection`).
- **Saved chats** (`core/history`): `persistence.ts` schedules a save on every chat change; `writePages` rewrites
  only pages whose message objects changed (the store never mutates in place). Files are saved on `fileCompleted`
  from `memoryFiles`. A saved file has `url: null`; `useFileUrl` decrypts it when it comes into view. Peer message
  and file ids are prefixed `p.` (`peerMessageId`), so they can't collide with ours and repeats are dropped after a
  reload too. Each saved record is encrypted with its storage key bound in (`sealRecord`).
- **Backups** (`core/backup`, `store/thunks/backup`): `goOffline` (calls, connections and relays stop; `app.paused`
  blocks new ones) → write or read the file → `goOnline`. The file: magic, format, a plain header (Argon2id salt,
  the backup key encrypted with the password), then records (Info, Contact…, per chat File + Chunk… then Page…,
  End), each encrypted with its index and type bound in. A restore writes new slots, then switches contacts, keys
  and slots in one `kv.batch`; on the setup screen the new identity is created first and saved only then.
- **Keys:** there is no single identity key. Every contact gets its own key pair (`contactKeys`, private halves
  never in Redux): we sign relay notes to them with it, and `Contact.myKey` is its public half.

## Code style (lint enforces most of it: run `npx eslint .` and `npx tsc --noEmit`)

- Arrow functions only, one exported function or component per file, named like the file.
- Comments in plain English that say why; no "removed" or history comments.
- Constants and limits go in the area's `config.ts` with a comment.
- Enums whose numbers are saved or sent (chat, signaling, control, protection, settings, backup records) have their
  values written out: never change one, add new ones at the end. A saved message kind this version doesn't know
  shows as "needs a newer version" and stays saved.
- Saved data: new fields are optional and missing means the default, so old saved data needs no migration.
- Enums, not string-literal unions; number enums by default. String enums only where the value is itself a
  CSS class name or a browser/HTML value (ButtonVariant, IconButtonVariant, MessageAuthor, TrackKind, …). Never
  `const enum` (isolatedModules). Enum values in text (logs, file names) must be turned into words
  (e.g. `CallAction[action]`), and CSS classes picked through a lookup table, never `styles[numericEnum]`.
- New UI: reuse `ui/` first. Something used by two features belongs in `ui/`, `hooks/` or `utils/`.
- Git hooks run eslint --fix and tsc on commit.

## Testing

- `npm run build` must pass. There is no unit test runner.
- `scripts/e2e-media.mjs`: two browsers connect by hand-copied codes and test voice/video messages, the TURN
  limit, zipped files and echo detection with the guard. It imports the app's modules in the page, so it needs the dev server:
  `VITE_TURN_URL= npx vite --port 5173 --strictPort &` then `node scripts/e2e-media.mjs`.
- `scripts/e2e-backup.mjs` (same dev server): saved chats, backups and restores in Chromium, Firefox and WebKit
  (also across them), errors, name clashes, protection changes, one tab, and a 1 GB backup's memory use.
  Restart the dev server after editing files: a reloaded module is a second copy, and the test would talk to that.
- `scripts/e2e-camera.mjs` (same dev server): a video call answered with audio only, then the camera turned on;
  switching between two (fake) cameras; the route shown from the other side's word about its end of the path.
- `scripts/e2e-move.mjs` (same dev server): a call moves to a new connection, goes back when it breaks, and stays when
  the test fails.
- `scripts/e2e-profile.mjs` (same dev server): in Chromium, Firefox and WebKit pictures made, phone numbers checked
  (mobile only), saved and spaced, the country guessed and searched, backups; two browsers swap, change and remove
  profiles, and keep them after a reload.
- `scripts/e2e-real-relays.mjs` (built app, `npx vite preview --port 4173`, real relays): Chromium adds Firefox and
  WebKit with invites, checks safety codes, one saved key per contact and a reconnect after reload.
- `scripts/e2e-location.mjs` (same dev server): a one-time and a live location between Chromium and Chromium and
  WebKit (moves, stop), then every bubble and both share windows drawn in all three engines, and what a tap opens
  as an iPhone, an Android phone, a Mac and other computers; pass a folder to get screenshots. (Firefox can't
  connect to another browser in the cloud container.)
- `scripts/check-turn.mjs`, `scripts/check-relays.mjs`.
- Scripts import `playwright`. In the cloud container it is preinstalled outside the project: link it with
  `ln -sfn /opt/node-tools/node_modules/playwright node_modules/playwright` (never run `playwright install`).
  Firefox and WebKit (Safari's engine) are installed too, by the environment's setup script: use `firefox` /
  `webkit` from `playwright` to check a feature in other browsers.
- Tricks: `--use-fake-device-for-media-stream` and `--use-file-for-fake-audio-capture=x.wav` for a fake
  camera/microphone; in the dev server, `await import('/web-rtc-chat/src/core/webrtc/state.ts')` from
  `page.evaluate` reaches the live sessions (e.g. set `session.route = SessionRoute.Relay` to test the TURN limit).

## Working with the owner

- Simple words, short answers, one step at a time. When they only ask a question, answer it and wait; don't
  start changing code.
- No backward compatibility: there are no users yet, so old saved data, links and app versions may simply break.
  Don't write code that reads old formats or talks to old versions.
- Commit and push on `master` only, as EzioMercer, unsigned, with no Co-Authored-By or other attribution.
- Keep README.md (features, privacy), the legal text (`features/settings/LegalDialog/LEGAL.ts`) and TODO.md true
  when behaviour changes.
