import { appleMapsUrl } from '../../../core/location/appleMapsUrl.ts';
import { googleMapsUrl } from '../../../core/location/googleMapsUrl.ts';
import type { GeoPoint } from '../../../store/chat/types.ts';
import { Dialog } from '../../../ui/Dialog/Dialog.tsx';
import { Icon } from '../../../ui/Icon/Icon.tsx';
import styles from './OpenWithDialog.module.css';

type Props = {
  point: GeoPoint;
  onClose: () => void;
};

// On an iPhone, iPad or Mac, which have no list of their own: Apple Maps, Google Maps, or Share… for any other app.
// Only the app picked learns the place.
export const OpenWithDialog = ({ point, onClose }: Props) => {
  const canShare = typeof navigator.share === 'function';

  const share = () => {
    onClose();
    navigator.share({ title: 'Location', url: googleMapsUrl(point) }).catch(() => undefined);
  };

  return (
    <Dialog title="Open with" onClose={onClose}>
      <div className={styles.list}>
        <a
          className={styles.app}
          href={appleMapsUrl(point)}
          target="_blank"
          rel="noreferrer noopener"
          onClick={onClose}
        >
          <span className={styles.icon}><Icon name="map" /></span>
          Apple Maps
        </a>
        <a
          className={styles.app}
          href={googleMapsUrl(point)}
          target="_blank"
          rel="noreferrer noopener"
          onClick={onClose}
        >
          <span className={styles.icon}><Icon name="map" /></span>
          Google Maps
        </a>
        {canShare && (
          <button className={styles.app} type="button" onClick={share}>
            <span className={styles.icon}><Icon name="share" /></span>
            Share…
          </button>
        )}
      </div>
    </Dialog>
  );
};
