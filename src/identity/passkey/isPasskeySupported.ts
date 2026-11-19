// Whether this browser can probably make a passkey with the PRF extension (needed to encrypt with it).
// `null` means the browser can't tell; we then let the user try.
export const isPasskeySupported = async (): Promise<boolean | null> => {
  if (typeof PublicKeyCredential === 'undefined' || !window.isSecureContext) {
    return false;
  }

  try {
    const capabilities = await PublicKeyCredential.getClientCapabilities?.();

    if (capabilities && 'extension:prf' in capabilities) {
      return Boolean(capabilities['extension:prf']);
    }
  } catch {
    // Older browsers can't tell.
    return null;
  }

  return null;
};
