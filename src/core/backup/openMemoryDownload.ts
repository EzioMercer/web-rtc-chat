import type { ByteSink } from './ByteSink.ts';

// The download link stays valid this long after the file is handed to the browser.
const URL_MS = 60_000;

// A download built in memory and handed to the browser at the end: for browsers without the streaming service
// worker. A very big backup may not fit.
export const openMemoryDownload = (name: string): ByteSink => {
  let parts: Uint8Array<ArrayBuffer>[] = [];

  return {
    write: async (bytes) => {
      parts.push(bytes);
    },
    close: async () => {
      const url = URL.createObjectURL(new Blob(parts, { type: 'application/octet-stream' }));
      const link = document.createElement('a');

      parts = [];
      link.href = url;
      link.download = name;
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), URL_MS);
    },
    abort: () => {
      parts = [];
    },
  };
};
