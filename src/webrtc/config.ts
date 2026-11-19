// STUN server lets each browser discover its public address.
export const RTC_CONFIG: RTCConfiguration = {
  iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
};

// Stop waiting for more ICE candidates after this long and use what was gathered.
export const ICE_GATHERING_TIMEOUT_MS = 5000;

export const CHANNEL_LABEL = 'chat';
