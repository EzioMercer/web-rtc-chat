// The id the other side has for a message in our chat: theirs carry our `p.` in front (see peerMessageId), ours carry
// it on their side. A reply is sent with the id it answers in their terms, so they can find it in their own chat.
export const toTheirId = (id: string) => (id.startsWith('p.') ? id.slice(2) : `p.${id}`);
