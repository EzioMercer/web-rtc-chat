import { useEffect, useState, type RefObject } from 'react';

// Full screen for `ref`'s element. Where the browser has no full screen for it (iPhone), `full` still turns on,
// and the element fills the window instead (with CSS).
export const useFullScreen = (ref: RefObject<HTMLElement | null>) => {
  const [full, setFull] = useState(false);

  useEffect(() => {
    // Leaving full screen with Esc or the browser's own controls.
    const onChange = () => setFull(document.fullscreenElement !== null && document.fullscreenElement === ref.current);

    document.addEventListener('fullscreenchange', onChange);

    return () => {
      document.removeEventListener('fullscreenchange', onChange);

      if (document.fullscreenElement && document.fullscreenElement === ref.current) {
        void document.exitFullscreen().catch(() => undefined);
      }
    };
  }, [ref]);

  const toggleFull = () => {
    const element = ref.current;

    if (document.fullscreenElement) {
      void document.exitFullscreen().catch(() => undefined);
    } else if (full || !element?.requestFullscreen) {
      setFull(!full);
    } else {
      element.requestFullscreen().catch(() => setFull(true));
    }
  };

  return { full, toggleFull };
};
