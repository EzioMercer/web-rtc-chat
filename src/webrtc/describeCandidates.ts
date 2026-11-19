// "2 local, 1 public" for the network addresses (ICE candidates) in a session description.
export const describeCandidates = (sdp: string | undefined): string => {
  const types = (sdp ?? '').split(/\r?\n/)
    .filter(line => line.startsWith('a=candidate:'))
    .map(line => / typ (\w+)/.exec(line)?.[1] ?? '');

  const count = (type: string) => types.filter(t => t === type).length;

  const parts = [
    [count('host'), 'local'],
    [count('srflx') + count('prflx'), 'public'],
    [count('relay'), 'relayed'],
  ].filter(([n]) => Number(n) > 0).map(([n, label]) => `${n} ${label}`);

  return parts.length ? parts.join(', ') : 'none';
};
