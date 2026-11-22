import { useEffect } from 'react';
import { startRinging, stopRinging, unlockSound } from '../../core/sound/ringtone.ts';
import { useAppSelector } from '../../store/useAppSelector.ts';

// Rings for an incoming call, and plays the ringback tone while we're calling someone.
export const useCallSounds = () => {
  const status = useAppSelector(state => state.call.status);

  useEffect(unlockSound, []);

  useEffect(() => {
    if (status === 'incoming' || status === 'outgoing') {
      startRinging(status);
    }

    return stopRinging;
  }, [status]);
};
