import { useEffect } from 'react';
import { startRinging, stopRinging, unlockSound, Ring } from '../../core/sound/ringtone.ts';
import { useAppSelector } from '../../store/useAppSelector.ts';
import { CallStatus } from '../../store/call/types.ts';

// Rings for an incoming call, and plays the ringback tone while we're calling someone.
export const useCallSounds = () => {
  const status = useAppSelector(state => state.call.status);

  useEffect(unlockSound, []);

  useEffect(() => {
    if (status === CallStatus.Incoming || status === CallStatus.Outgoing) {
      startRinging(status === CallStatus.Incoming ? Ring.Incoming : Ring.Outgoing);
    }

    return stopRinging;
  }, [status]);
};
