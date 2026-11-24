import { useEffect, useRef, useState } from 'react';
import { loadFileBlob } from '../core/history/loadFileBlob.ts';
import { type FileMessage, FileStatus, MessageAuthor } from '../store/chat/types.ts';

// Start opening a saved file this far before it scrolls into view.
const AHEAD = '600px';

// The URL to show a file with. A saved file (from an earlier session) has none: it is decrypted only when it comes
// near the screen, and freed again when it is no longer shown, so a long chat full of videos doesn't fill the memory.
// Put `ref` on the element that shows the file.
export const useFileUrl = (chat: string, file: FileMessage) => {
  const ref = useRef<HTMLDivElement>(null);
  const [opened, setOpened] = useState<{ url: string | null; error: string | null }>({ url: null, error: null });
  // Ours is saved as soon as it is chosen (see persistence), so one still to be sent shows too.
  const saved = !file.url && (file.status === FileStatus.Done || file.from === MessageAuthor.Me);
  const { id, size, mime } = file;

  useEffect(() => {
    const element = ref.current;

    if (!saved || !element) {
      return undefined;
    }

    let url: string | null = null;
    let stopped = false;

    const observer = new IntersectionObserver((entries) => {
      if (!entries.some(entry => entry.isIntersecting)) {
        return;
      }

      observer.disconnect();
      loadFileBlob(chat, { id, size, mime })
        .then((blob) => {
          if (!stopped) {
            url = URL.createObjectURL(blob);
            setOpened({ url, error: null });
          }
        })
        .catch((err: unknown) => {
          if (!stopped) {
            setOpened({ url: null, error: err instanceof Error ? err.message : 'Could not open it.' });
          }
        });
    }, { rootMargin: AHEAD });

    observer.observe(element);

    return () => {
      stopped = true;
      observer.disconnect();

      if (url) {
        URL.revokeObjectURL(url);
      }
    };
  }, [saved, chat, id, size, mime]);

  return { ref, url: file.url ?? opened.url, error: opened.error };
};
