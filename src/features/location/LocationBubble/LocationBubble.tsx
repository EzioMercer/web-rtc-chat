import { useState, type MouseEvent } from 'react';
import { LIVE_STALE_MS } from '../../../core/location/config.ts';
import { geoUrl } from '../../../core/location/geoUrl.ts';
import { googleMapsUrl } from '../../../core/location/googleMapsUrl.ts';
import { useNow } from '../../../hooks/useNow.ts';
import { type LocationMessage, MessageAuthor } from '../../../store/chat/types.ts';
import { stopLiveLocation } from '../../../store/thunks/location/stopLiveLocation.ts';
import { useAppDispatch } from '../../../store/useAppDispatch.ts';
import { useAppSelector } from '../../../store/useAppSelector.ts';
import { isAndroid } from '../../../utils/isAndroid.ts';
import { isAppleDevice } from '../../../utils/isAppleDevice.ts';
import { cx } from '../../../utils/cx.ts';
import { formatAgo } from '../formatAgo.ts';
import { formatClock } from '../formatClock.ts';
import { formatLeft } from '../formatLeft.ts';
import { LocationMap } from '../LocationMap/LocationMap.tsx';
import { OpenWithDialog } from '../OpenWithDialog/OpenWithDialog.tsx';
import styles from './LocationBubble.module.css';

type Props = {
  chat: string;
  location: LocationMessage;
};

// A shared place: a drawn map with a pin. It is a Google Maps link, so a long tap or right click offers the browser's
// "Copy link"; a tap opens it the device's own way: Android's list of apps, a short list on an iPhone, iPad or Mac
// (which have none of their own), Google Maps in the browser elsewhere. A live one has the person's picture as its
// pin, a LIVE badge, the time left and, under it, when it last moved; ours can be stopped.
export const LocationBubble = ({ chat, location }: Props) => {
  const dispatch = useAppDispatch();
  const [choosing, setChoosing] = useState(false);
  const mine = location.from === MessageAuthor.Me;
  const contact = useAppSelector(state => state.contacts.list.find(c => c.id === chat));
  const ourPicture = useAppSelector(state => state.profile.picture);
  const live = location.liveUntil !== undefined;
  // A change (a stop, say) shows at once, without waiting for the next tick.
  const now = Math.max(useNow(5_000, live), location.updatedAt ?? 0);
  const until = location.liveUntil ?? now;
  const running = live && until > now;
  const updated = location.updatedAt ?? location.at ?? now;
  const stale = running && now - updated > LIVE_STALE_MS;
  const progress = running ? (until - now) / Math.max(1, until - (location.at ?? now)) : 0;

  // Only a live one has a line under the map: when it last moved (or, once ended, when it stopped).
  const status = () => {
    if (!running) {
      return `Last updated at ${formatClock(updated)}`;
    }

    return <span className={cx(stale && styles.stale)}>{`Updated ${formatAgo(now - updated)}`}</span>;
  };

  // Anywhere else the link just opens, in a new tab.
  const open = (e: MouseEvent) => {
    if (isAndroid()) {
      e.preventDefault();
      window.location.assign(geoUrl(location));
    } else if (isAppleDevice()) {
      e.preventDefault();
      setChoosing(true);
    }
  };

  const tick = mine && (
    <span
      className={cx(styles.tick, location.pending && styles.pending)}
      title={location.pending ? 'Not delivered yet' : 'Delivered'}
      aria-label={location.pending ? 'Not delivered yet' : 'Delivered'}
    >
      {location.pending ? '◷' : '✓'}
    </span>
  );

  return (
    <div
      className={cx(
        styles.card,
        live && styles.live,
        running && styles.running,
        // Without a line under it, the map reaches the bubble's tail corner.
        !live && (mine ? styles.tailRight : styles.tailLeft),
      )}
    >
      <a
        className={styles.open}
        href={googleMapsUrl(location)}
        target="_blank"
        rel="noreferrer noopener"
        aria-label="Open in a maps app"
        onClick={open}
      >
        <span className={styles.frame}>
          <LocationMap
            // Their ids carry a prefix on our side (see peerMessageId): without it both sides draw the same streets.
            seed={location.id.replace(/^p\./, '')}
            faded={live && !running}
            live={live
              ? { picture: mine ? ourPicture : contact?.picture, name: mine ? '' : contact?.name, running }
              : undefined}
          >
            {live && (
              <span className={cx(styles.badge, running && styles.on)}>
                {running && <span className={styles.dot} />}
                {running ? 'LIVE' : 'ENDED'}
              </span>
            )}
            {running && <span className={styles.left}>{`${formatLeft(until - now)} left`}</span>}
            {!live && tick && <span className={styles.onMap}>{tick}</span>}
            {running && (
              <span className={styles.progress}>
                <span className={styles.bar} style={{ width: `${Math.max(0, Math.min(1, progress)) * 100}%` }} />
              </span>
            )}
          </LocationMap>
        </span>
        {live && (
          <span className={styles.info}>
            <span className={styles.meta}>{status()}</span>
            {tick}
          </span>
        )}
      </a>
      {mine && running && (
        <button className={styles.stop} type="button" onClick={() => dispatch(stopLiveLocation(chat, location.id))}>
          Stop sharing
        </button>
      )}
      {choosing && <OpenWithDialog point={location} onClose={() => setChoosing(false)} />}
    </div>
  );
};
