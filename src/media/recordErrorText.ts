// Why recording couldn't start, in words for the user.
export const recordErrorText = (err: unknown, video: boolean): string => {
  const device = video ? 'camera and microphone' : 'microphone';
  const name = err instanceof DOMException ? err.name : '';

  if (name === 'NotAllowedError' || name === 'SecurityError') {
    return `Can't record: the ${device} is blocked. Allow it in the browser's settings for this site.`;
  }

  if (name === 'NotFoundError' || name === 'OverconstrainedError') {
    return `Can't record: no ${device} found.`;
  }

  if (name === 'NotReadableError' || name === 'AbortError') {
    return `Can't record: another app is using the ${device}.`;
  }

  return `Can't record: ${err instanceof Error ? err.message : 'something went wrong.'}`;
};
