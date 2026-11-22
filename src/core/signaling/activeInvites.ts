// Our open invites, by the public key of their mailbox. Memory only: an invite dies with the tab.
export const activeInvites = new Map<string, { sk: Uint8Array; expiresAt: number }>();
