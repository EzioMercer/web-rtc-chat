// What went wrong while finding the place, in words for the user.
export const positionError = (err: unknown): string => {
  const code = (err as GeolocationPositionError | null)?.code;

  if (code === 1) {
    return 'Location access is blocked. Allow it for this site in the browser\'s settings, then try again.';
  }

  if (code === 3) {
    return 'Finding your location took too long. Try again, maybe near a window or outside.';
  }

  return 'Your location couldn\'t be found. Check that location is turned on for this device.';
};
