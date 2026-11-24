import { type PointerEvent, useRef, useState } from 'react';

// A finger moved this far (px) decides between a swipe (sideways) and scrolling (up or down).
const DECIDE_PX = 10;
// The bubble follows the finger to the left this far at most...
const MAX_PX = 72;
// ...and let go past this point, it answers the message.
const REPLY_PX = 56;
// A short buzz when it goes past that point, where the phone can (ms).
const BUZZ_MS = 12;

type Start = { id: string; x: number; y: number; pointer: number; swiping: boolean; offset: number };

// Swiping a message to the left on a touch screen answers it, as in other messengers: the bubble follows the finger
// and the reply arrow shows behind it. Up and down still scrolls the chat. `offset` is how far the swiped bubble is
// moved (px, negative), `progress` how close it is to answering (0-1), and `ready` whether letting go now does.
export const useSwipeReply = (onReply: (id: string) => void) => {
  const start = useRef<Start | null>(null);
  const [swipe, setSwipe] = useState<{ id: string; offset: number } | null>(null);
  // A swipe just ended: the click the browser may send afterwards isn't a tap.
  const swiped = useRef(false);

  const down = (e: PointerEvent, id: string, allowed: boolean) => {
    swiped.current = false;
    start.current = allowed && e.pointerType !== 'mouse' && e.isPrimary
      ? { id, x: e.clientX, y: e.clientY, pointer: e.pointerId, swiping: false, offset: 0 }
      : null;
  };

  // Returns whether this move is part of a swipe (then it isn't a long press either).
  const move = (e: PointerEvent) => {
    const from = start.current;

    if (!from || e.pointerId !== from.pointer) {
      return false;
    }

    const dx = e.clientX - from.x;
    const dy = e.clientY - from.y;

    if (!from.swiping) {
      if (Math.abs(dy) > DECIDE_PX && Math.abs(dy) >= Math.abs(dx)) {
        start.current = null;

        return false;
      }

      if (dx > -DECIDE_PX || Math.abs(dx) <= Math.abs(dy)) {
        return false;
      }

      from.swiping = true;

      // The rest of the swipe comes here even if the finger leaves the bubble.
      try {
        (e.currentTarget as Element).setPointerCapture(e.pointerId);
      } catch (err) {
        // A pointer the browser doesn't know (already lifted): it still follows while it stays on the bubble.
        console.warn('Swipe without pointer capture', err);
      }
    }

    const offset = Math.max(-MAX_PX, Math.min(0, dx));

    if (from.offset > -REPLY_PX && offset <= -REPLY_PX) {
      navigator.vibrate?.(BUZZ_MS);
    }

    from.offset = offset;
    setSwipe({ id: from.id, offset });

    return true;
  };

  const up = () => {
    const from = start.current;

    start.current = null;

    if (!from?.swiping) {
      return;
    }

    swiped.current = true;

    if (from.offset <= -REPLY_PX) {
      onReply(from.id);
    }

    setSwipe(null);
  };

  const cancel = () => {
    start.current = null;
    setSwipe(null);
  };

  // Whether the click that follows was the end of a swipe (and must not open the menu or a file).
  const justSwiped = () => {
    const was = swiped.current;

    swiped.current = false;

    return was;
  };

  return {
    swipe: swipe && { ...swipe, ready: swipe.offset <= -REPLY_PX, progress: Math.min(1, -swipe.offset / REPLY_PX) },
    down,
    move,
    up,
    cancel,
    justSwiped,
  };
};
