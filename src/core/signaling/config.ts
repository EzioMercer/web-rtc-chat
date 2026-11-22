// Invites can be used once, within this time.
export const INVITE_TTL_MS = 10 * 60 * 1000;

// After using an invite, how long we wait for the inviter's app to reveal its key. It is open (the invite lives in
// its tab), so the answer normally comes within seconds.
export const REVEAL_TIMEOUT_MS = 30_000;

// Emojis in the safety code of a contact added with an invite. 4 from 256 is 1 chance in 4.3 billion, and enough,
// because the invite hides the inviter's key until the other side has sent theirs: someone in the middle gets one
// blind try and can't search for a matching key (see inviteCommitment).
export const INVITE_CODE_LENGTH = 4;

// Emojis in a safety code made only from two keys (manual mode, where there is no invite to hide a key).
// Someone in the middle can try many keys there, so it needs to be longer: 6 from 256 is 1 in 281 trillion.
export const KEY_CODE_LENGTH = 6;
