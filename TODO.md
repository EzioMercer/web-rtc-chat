# TODO

Only open items. Everything done is described in the README.

## Next

- [ ] Field test the echo guard on real phones, Firefox on Android with Safari on iPhone (found: Firefox on Android
  causes the echo; Chrome on both phones is fine). Check that the prompt comes, and doesn't come in calls without
  echo; tune ECHO_MATCH in src/core/webrtc/echoConfig.ts if needed.
- [ ] Field test the new path search (switching to TURN when the direct path breaks) on real phones: turn Wi-Fi off
  and on during a call.
- [ ] Field test moving a call from the TURN relay to a direct connection on real phones (e.g. start on mobile data,
  then join the same Wi-Fi): the call must move without dropping. Also a call that stays on the relay for over an
  hour must not drop.
- [ ] Field test switching cameras in a call on real phones, above all an iPhone (Safari runs one camera at a time,
  so the old one is stopped first): the other side must see the back camera, and our preview isn't mirrored. Also
  turning the camera on after answering a video call with audio only.
- [ ] Field test voice and video messages on real phones, above all an iPhone (Safari) with an Android phone
  (Chrome and Firefox): each side must play what the other recorded.
- [ ] Field test live location on real phones, above all an iPhone (Safari): updates while walking, what happens
  when the screen locks or the app goes to the background (the other side should see "last updated … ago"), and
  what a tap opens: Android's list of apps (geo:), and on an iPhone Apple Maps / Google Maps (the app, if it is
  installed) and Share….
- [ ] Two devices on the same Wi-Fi with "AP isolation" (guest networks often have it) can't connect directly; check
  that they fall back to TURN quickly.

- [ ] Field test backups on a real iPhone (Safari, and installed on the Home Screen): the download through the
  service worker (one file, saved to Files), a backup with a lot of media (memory), and restoring it. Also check
  that Safari keeps the saved chats of the installed app after 7 days without a visit.
- [ ] Field test saved chats on phones: Firefox asks before allowing persistent storage; check the question comes
  once and the chats survive the browser cleaning up.

## Maybe

- [ ] Show the "new version" notice only for releases marked as important, not for every update.
- [ ] CI: run the browser tests weekly, and cache the Playwright browsers.
- [ ] Donation link in the legal notice, once a platform is chosen (ask an accountant about taxes first).

## Later (not planned yet)

- [ ] Push notifications when the tab is closed, through a stateless Cloudflare Worker that forwards end-to-end
  encrypted web pushes.
- [ ] Syncing chats between your own devices automatically (today: a backup file moved by hand, one device at a
  time).
- [ ] Multiple devices per person.
- [ ] Messages to a contact who is offline while you close the app (today they wait only while your tab is open),
  encrypted.
- [ ] A longer relay list with fallback when relays die. It must be the same, in the same order, for everyone, so peers
  still meet on the same relays. Possibly fetched from a source we control, such as a file in this repo.
