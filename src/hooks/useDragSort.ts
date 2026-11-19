import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';

const LONG_PRESS_MS = 350;
const MOVE_SLOP_PX = 8;

type Drag = {
  id: string;
  pointerId: number;
  startY: number;
  active: boolean;
  timer: number;
};

// Reordering a list by dragging rows: with a mouse right away, on touch screens after a long press.
// While dragging, `order` is the live order; `onDrop(id, beforeId)` is called once at the end.
export const useDragSort = (ids: string[], onDrop: (id: string, beforeId: string | null) => void) => {
  const [order, setOrder] = useState<string[] | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const drag = useRef<Drag | null>(null);
  const orderRef = useRef<string[] | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  // Set right after a drag, so the click that follows doesn't open the conversation.
  const suppressClick = useRef(false);

  const begin = () => {
    if (!drag.current) {
      return;
    }

    drag.current.active = true;
    orderRef.current = ids;
    setOrder(ids);
    setDraggingId(drag.current.id);
    navigator.vibrate?.(20);
  };

  // While dragging on a touch screen, the page must not scroll.
  useEffect(() => {
    const list = listRef.current;

    const onTouchMove = (e: TouchEvent) => {
      if (drag.current?.active) {
        e.preventDefault();
      }
    };

    list?.addEventListener('touchmove', onTouchMove, { passive: false });

    return () => list?.removeEventListener('touchmove', onTouchMove);
  }, []);

  const onPointerDown = (id: string) => (e: ReactPointerEvent<HTMLElement>) => {
    if (e.button !== 0 || ids.length < 2) {
      return;
    }

    drag.current = { id, pointerId: e.pointerId, startY: e.clientY, active: false, timer: 0 };

    if (e.pointerType !== 'mouse') {
      drag.current.timer = window.setTimeout(begin, LONG_PRESS_MS);
    }
  };

  const onPointerMove = (e: ReactPointerEvent<HTMLElement>) => {
    const current = drag.current;

    if (!current || current.pointerId !== e.pointerId) {
      return;
    }

    if (!current.active) {
      if (Math.abs(e.clientY - current.startY) < MOVE_SLOP_PX) {
        return;
      }

      // A touch that moves before the long press is a scroll, not a drag.
      if (e.pointerType !== 'mouse') {
        window.clearTimeout(current.timer);
        drag.current = null;

        return;
      }

      e.currentTarget.setPointerCapture(e.pointerId);
      begin();
    }

    const target = document.elementFromPoint(e.clientX, e.clientY)?.closest<HTMLElement>('[data-sort-id]');
    const overId = target?.dataset.sortId;
    const live = orderRef.current;

    if (!overId || !live || overId === current.id || !live.includes(overId)) {
      return;
    }

    const next = live.filter(item => item !== current.id);
    const rect = target.getBoundingClientRect();
    const index = next.indexOf(overId) + (e.clientY > rect.top + rect.height / 2 ? 1 : 0);

    next.splice(index, 0, current.id);
    orderRef.current = next;
    setOrder(next);
  };

  const finish = () => {
    const current = drag.current;
    const live = orderRef.current;

    if (current) {
      window.clearTimeout(current.timer);
    }

    if (current?.active && live) {
      const index = live.indexOf(current.id);

      suppressClick.current = true;
      window.setTimeout(() => {
        suppressClick.current = false;
      }, 0);
      onDrop(current.id, live[index + 1] ?? null);
    }

    drag.current = null;
    orderRef.current = null;
    setOrder(null);
    setDraggingId(null);
  };

  return {
    listRef,
    order: order ?? ids,
    draggingId,
    suppressClick,
    rowProps: (id: string) => ({
      'data-sort-id': id,
      'onPointerDown': onPointerDown(id),
      'onPointerMove': onPointerMove,
      'onPointerUp': finish,
      'onPointerCancel': finish,
      'onContextMenu': (e: React.MouseEvent) => {
        if (drag.current) {
          e.preventDefault();
        }
      },
    }),
  };
};
