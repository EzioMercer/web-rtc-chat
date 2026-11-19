// A message for the user from whatever was thrown.
export const errorMessage = (err: unknown): string => {
  if (err instanceof DOMException && err.name === 'NotAllowedError') {
    return 'The passkey prompt was cancelled or timed out.';
  }

  return err instanceof Error ? err.message : 'Something went wrong.';
};
