import { useRef, useState, type PointerEvent } from 'react';
import { MediaVideo } from '../MediaVideo/MediaVideo.tsx';
import styles from './LocalPreview.module.css';

type Props = {
  stream: MediaStream | null;
};

type Drag = { x: number; y: number; startX: number; startY: number; freeW: number; freeH: number };

const clamp = (value: number) => Math.min(Math.max(value, 0), 1);

// Our own camera, small, over their video. Drag it anywhere inside the video.
export const LocalPreview = ({ stream }: Props) => {
  // Where it sits, from 0 (left/top) to 1 (right/bottom) of the free space.
  const [pos, setPos] = useState({ x: 1, y: 1 });
  const drag = useRef<Drag | null>(null);

  const down = (e: PointerEvent<HTMLDivElement>) => {
    const box = e.currentTarget.getBoundingClientRect();
    const area = e.currentTarget.parentElement?.getBoundingClientRect();

    if (!area) {
      return;
    }

    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = {
      x: e.clientX,
      y: e.clientY,
      startX: pos.x,
      startY: pos.y,
      freeW: Math.max(area.width - box.width, 1),
      freeH: Math.max(area.height - box.height, 1),
    };
  };

  const move = (e: PointerEvent<HTMLDivElement>) => {
    const d = drag.current;

    if (d) {
      setPos({ x: clamp(d.startX + (e.clientX - d.x) / d.freeW), y: clamp(d.startY + (e.clientY - d.y) / d.freeH) });
    }
  };

  const up = () => {
    drag.current = null;
  };

  return (
    <div className={styles.area}>
      <div
        className={styles.preview}
        style={{
          left: `${pos.x * 100}%`,
          top: `${pos.y * 100}%`,
          transform: `translate(${-pos.x * 100}%, ${-pos.y * 100}%)`,
        }}
        title="Drag to move"
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerCancel={up}
      >
        <MediaVideo stream={stream} className={styles.video} muted />
      </div>
    </div>
  );
};
