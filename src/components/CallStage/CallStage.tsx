import { useState, type CSSProperties } from 'react';
import { cx } from '../../utils/cx.ts';
import { MediaVideo } from '../MediaVideo/MediaVideo.tsx';
import styles from './CallStage.module.css';
import { usePip } from './usePip.ts';

type Props = {
  remoteStream: MediaStream | null;
  remoteVersion: number;
  // Their video is on (camera or screen). Their element stays mounted anyway: it also plays their audio.
  showRemote: boolean;
  localStream: MediaStream | null;
  showLocal: boolean;
  // Our camera is shown mirrored, like a mirror; a shared screen isn't.
  mirrorLocal: boolean;
};

// Their video big and ours small (tap the small one to swap). Both <video> elements stay in place and only
// change size, so swapping never interrupts their audio.
export const CallStage = ({ remoteStream, remoteVersion, showRemote, localStream, showLocal, mirrorLocal }: Props) => {
  const [swapped, setSwapped] = useState(false);
  const [shapes, setShapes] = useState({ remote: 16 / 9, local: 4 / 3 });
  const pip = usePip(() => setSwapped(value => !value));
  // Swapping needs both pictures.
  const localBig = swapped && showRemote && showLocal;

  // The small picture keeps its video's own shape, so the whole frame is visible.
  const small = (shape: number): CSSProperties => ({
    ...pip.style,
    aspectRatio: shape,
    ...(shape < 1 ? { height: '40%' } : { width: '32%' }),
  });

  return (
    <>
      <div
        className={cx(styles.frame, !showRemote && styles.hidden, localBig ? styles.small : styles.big)}
        style={localBig ? small(shapes.remote) : undefined}
        {...(localBig ? pip.handlers : {})}
      >
        <MediaVideo
          stream={remoteStream}
          version={remoteVersion}
          className={styles.video}
          onShape={remote => setShapes(s => (s.remote === remote ? s : { ...s, remote }))}
        />
      </div>
      {showLocal && (
        <div
          className={cx(styles.frame, localBig ? styles.big : styles.small)}
          style={localBig ? undefined : small(shapes.local)}
          title={showRemote ? 'Drag to move, tap to swap' : 'Drag to move'}
          {...(localBig ? {} : pip.handlers)}
        >
          <MediaVideo
            stream={localStream}
            className={cx(styles.video, mirrorLocal && styles.mirror)}
            muted
            onShape={local => setShapes(s => (s.local === local ? s : { ...s, local }))}
          />
        </div>
      )}
    </>
  );
};
