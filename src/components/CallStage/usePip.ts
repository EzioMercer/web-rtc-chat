import { useRef, useState, type PointerEvent } from 'react';

type Drag = { x: number; y: number; startX: number; startY: number; freeW: number; freeH: number; moved: boolean };

// Moving the finger less than this is a tap, not a drag.
const TAP_PX = 8;

const clamp = (value: number) => Math.min(Math.max(value, 0), 1);

// The small picture over the big one: drag it anywhere inside the stage; a tap (no drag) calls `onTap`.
export const usePip = (onTap: () => void) => {
  // Where it sits, from 0 (left/top) to 1 (right/bottom) of the free space.
  const [pos, setPos] = useState({ x: 1, y: 1 });
  const drag = useRef<Drag | null>(null);

  const onPointerDown = (e: PointerEvent<HTMLElement>) => {
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
      // The stage minus a 10 px margin on each side.
      freeW: Math.max(area.width - 20 - box.width, 1),
      freeH: Math.max(area.height - 20 - box.height, 1),
      moved: false,
    };
  };

  const onPointerMove = (e: PointerEvent<HTMLElement>) => {
    const d = drag.current;

    if (!d) {
      return;
    }

    const dx = e.clientX - d.x;
    const dy = e.clientY - d.y;

    d.moved ||= Math.hypot(dx, dy) > TAP_PX;

    if (d.moved) {
      setPos({ x: clamp(d.startX + dx / d.freeW), y: clamp(d.startY + dy / d.freeH) });
    }
  };

  const onPointerUp = () => {
    const tapped = drag.current && !drag.current.moved;

    drag.current = null;

    if (tapped) {
      onTap();
    }
  };

  const onPointerCancel = () => {
    drag.current = null;
  };

  const style = {
    left: `calc(10px + (100% - 20px) * ${pos.x})`,
    top: `calc(10px + (100% - 20px) * ${pos.y})`,
    transform: `translate(${-pos.x * 100}%, ${-pos.y * 100}%)`,
  };

  return { style, handlers: { onPointerDown, onPointerMove, onPointerUp, onPointerCancel } };
};
