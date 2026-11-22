// Browsers known to let the other person hear an echo of their own voice: Firefox on Android (field test, 2026). Its
// echo filter can't keep up with a phone's loudspeaker. Chrome on Android and every browser on iPhone were fine.
export const isEchoProne = (): boolean => /Android/i.test(navigator.userAgent)
  && /Firefox\//.test(navigator.userAgent);
