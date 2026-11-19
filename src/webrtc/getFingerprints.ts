// The DTLS certificate fingerprints in a session description.
export const getFingerprints = (sdp: string | undefined): string[] => (sdp ?? '')
  .split(/\r?\n/)
  .filter(line => line.startsWith('a=fingerprint:'))
  .map(line => line.slice('a=fingerprint:'.length).trim().toLowerCase());
