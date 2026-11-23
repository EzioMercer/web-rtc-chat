import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { cx } from '../../../utils/cx.ts';
import { MediaVideo } from '../../../ui/MediaVideo/MediaVideo.tsx';
import styles from './CallStage.module.css';
import { usePip } from './usePip.ts';

type Props = {
  remoteStream: MediaStream | null;
  remoteVersion: number;
  // Their video is on (camera or screen). Their element stays mounted anyway: it also plays their audio.
  showRemote: boolean;
  localStream: MediaStream | null;
  // Changes when our camera's track in `localStream` is replaced (another camera).
  localVersion: number;
  showLocal: boolean;
  // Our camera is shown mirrored, like a mirror; a shared screen isn't.
  mirrorLocal: boolean;
  // Keep the small picture above this many px at the bottom (the floating buttons in full screen).
  bottomInset: number;
};

// The small picture's longer side, as a share of the stage's longer side (about what video call apps use), with
// a minimum in px, and never more than this share of the stage's width or height.
const PIP_SHARE = 0.25;
const PIP_MIN_PX = 100;
const PIP_MAX_SHARE = 0.4;

// Width and height (px) of a picture shaped `ratio` (width / height) for a stage of `w` x `h`.
const pipSize = (ratio: number, w: number, h: number) => {
  const long = Math.max(Math.max(w, h) * PIP_SHARE, PIP_MIN_PX);
  const width = ratio >= 1 ? long : long * ratio;
  const height = ratio >= 1 ? long / ratio : long;
  const scale = Math.min(1, (w * PIP_MAX_SHARE) / width, (h * PIP_MAX_SHARE) / height);

  return { width: width * scale, height: height * scale };
};

// Their video big and ours small (tap the small one to swap). Both <video> elements stay in place and only
// change size, so swapping never interrupts their audio.
export const CallStage = (props: Props) => {
  const { remoteStream, remoteVersion, showRemote, localStream, localVersion, showLocal, mirrorLocal } = props;
  const { bottomInset } = props;
  const [swapped, setSwapped] = useState(false);
  const [shapes, setShapes] = useState({ remote: 16 / 9, local: 4 / 3 });
  const [stage, setStage] = useState({ w: 0, h: 0 });
  const remoteRef = useRef<HTMLDivElement>(null);
  const pip = usePip(() => setSwapped(value => !value), bottomInset);

  // The stage's size (it changes in full screen, or when the phone is turned).
  useEffect(() => {
    const element = remoteRef.current?.parentElement;

    if (!element) {
      return;
    }

    const observer = new ResizeObserver(() => setStage({ w: element.clientWidth, h: element.clientHeight }));

    observer.observe(element);

    return () => observer.disconnect();
  }, []);

  // Swapping needs both pictures.
  const localBig = swapped && showRemote && showLocal;

  // The small picture keeps its video's own shape, so the whole frame is visible.
  const small = (shape: number): CSSProperties => ({ ...pip.style, ...pipSize(shape, stage.w, stage.h) });

  return (
    <>
      <div
        ref={remoteRef}
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
            version={localVersion}
            className={cx(styles.video, mirrorLocal && styles.mirror)}
            muted
            onShape={local => setShapes(s => (s.local === local ? s : { ...s, local }))}
          />
        </div>
      )}
    </>
  );
};
