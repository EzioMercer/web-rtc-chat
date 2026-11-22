// AES-GCM ciphertext with its IV, both base64url.
export type Sealed = {
  iv: string;
  data: string;
};

// One position of a safety code: the picture and a word to say it aloud.
export type SafetyEmoji = {
  emoji: string;
  name: string;
};
