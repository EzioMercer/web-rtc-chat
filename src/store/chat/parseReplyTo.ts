// The id a reply from the other side answers, in our chat's terms (they turned it into ours, see toTheirId): one of
// ours, or one of theirs with `p.` in front. Anything else is dropped and the message comes as a normal one.
export const parseReplyTo = (value: unknown): string | undefined => (
  typeof value === 'string' && /^(p\.)?[\w-]{1,64}$/.test(value) ? value : undefined
);
