import { useEffect, useState } from 'react';
import { LIVE_DURATIONS_MS } from '../../../core/location/config.ts';
import { findPosition } from '../../../core/location/findPosition.ts';
import { positionError } from '../../../core/location/positionError.ts';
import type { GeoPoint } from '../../../store/chat/types.ts';
import { sendLocation } from '../../../store/thunks/location/sendLocation.ts';
import { startLiveLocation } from '../../../store/thunks/location/startLiveLocation.ts';
import { useAppDispatch } from '../../../store/useAppDispatch.ts';
import { useAppSelector } from '../../../store/useAppSelector.ts';
import { Button } from '../../../ui/Button/Button.tsx';
import { ButtonVariant } from '../../../ui/Button/ButtonVariant.ts';
import { Dialog } from '../../../ui/Dialog/Dialog.tsx';
import { SegmentedControl } from '../../../ui/SegmentedControl/SegmentedControl.tsx';
import { formatLeft } from '../formatLeft.ts';
import { LocationMap } from '../LocationMap/LocationMap.tsx';
import styles from './LocationDialog.module.css';

type Props = {
  convKey: string;
  live: boolean;
  onClose: () => void;
};

const DURATIONS = LIVE_DURATIONS_MS.map(value => ({
  value,
  label: value < 3_600_000 ? formatLeft(value) : `${value / 3_600_000} hour${value > 3_600_000 ? 's' : ''}`,
}));

// Finds where we are and sends it: once, or live for the chosen time.
export const LocationDialog = ({ convKey, live, onClose }: Props) => {
  const dispatch = useAppDispatch();
  const name = useAppSelector(state => state.contacts.list.find(c => c.id === convKey)?.name);
  const picture = useAppSelector(state => state.profile.picture);
  const [point, setPoint] = useState<GeoPoint | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [duration, setDuration] = useState(LIVE_DURATIONS_MS[1]);
  // Counts the tries: "Try again" looks once more.
  const [attempt, setAttempt] = useState(0);
  const who = name ?? 'the other person';
  const chosen = DURATIONS.find(option => option.value === duration)?.label ?? '';

  useEffect(() => {
    let alive = true;

    findPosition().then(
      found => alive && setPoint(found),
      (err: unknown) => alive && setError(positionError(err)),
    );

    return () => {
      alive = false;
    };
  }, [attempt]);

  const retry = () => {
    setError(null);
    setPoint(null);
    setAttempt(attempt + 1);
  };

  const send = () => {
    if (!point) {
      return;
    }

    const sent = live
      ? dispatch(startLiveLocation(convKey, point, duration))
      : dispatch(sendLocation(convKey, point)) !== null;

    if (sent) {
      onClose();
    }
  };

  return (
    <Dialog title={live ? 'Share live location' : 'Send location'} onClose={onClose}>
      <LocationMap seed={`preview-${convKey}`} live={live ? { picture, running: Boolean(point) } : undefined}>
        {!point && (
          <span className={styles.overlay}>{error ? 'Location not found' : 'Finding your location…'}</span>
        )}
      </LocationMap>
      {point?.accuracy !== undefined && (
        <p className={styles.place}>{`Accurate to ${Math.round(point.accuracy)} m`}</p>
      )}
      {error && <p className={styles.error}>{error}</p>}
      {live && (
        <>
          <SegmentedControl options={DURATIONS} value={duration} wide onChange={setDuration} />
          <p className={styles.note}>
            {`${name ? `${name} sees` : 'They see'} where you are as you move, for ${chosen}. `}
            It updates while this app is open, and you can stop it any time.
          </p>
        </>
      )}
      <p className={styles.note}>
        Only
        {' '}
        {who}
        {' '}
        gets it, end-to-end encrypted. No map service sees it unless someone opens it in a maps app.
      </p>
      <div className={styles.buttons}>
        {error
          ? <Button variant={ButtonVariant.Secondary} wide onClick={retry}>Try again</Button>
          : (
              <Button wide disabled={!point} onClick={send}>
                {live ? 'Share live location' : 'Send this location'}
              </Button>
            )}
      </div>
    </Dialog>
  );
};
