// Ids the other side gives its messages and files, made safe to use as ours: checked, and kept apart from the ids
// we make (ours never contain a dot), so they can't collide with or overwrite one of ours. Null if not acceptable.
export const peerMessageId = (id: unknown): string | null => (
  typeof id === 'string' && /^[\w-]{1,64}$/.test(id) ? `p.${id}` : null
);
