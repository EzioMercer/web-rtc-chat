// Reads exact amounts of bytes from a stream.
export const createByteReader = (stream: ReadableStream<Uint8Array>) => {
  const reader = stream.getReader();
  const parts: Uint8Array[] = [];
  let buffered = 0;
  let ended = false;
  // Bytes handed out so far.
  let position = 0;

  // `n` bytes, or null if the stream ends first.
  const read = async (n: number): Promise<Uint8Array<ArrayBuffer> | null> => {
    while (buffered < n && !ended) {
      const { value, done } = await reader.read();

      if (done) {
        ended = true;
      } else if (value.length) {
        parts.push(value);
        buffered += value.length;
      }
    }

    if (buffered < n) {
      return null;
    }

    const out = new Uint8Array(n);
    let filled = 0;

    while (filled < n) {
      const part = parts[0];
      const take = Math.min(part.length, n - filled);

      out.set(part.subarray(0, take), filled);
      filled += take;

      if (take === part.length) {
        parts.shift();
      } else {
        parts[0] = part.subarray(take);
      }
    }

    buffered -= n;
    position += n;

    return out;
  };

  return {
    read,
    position: () => position,
    cancel: () => void reader.cancel().catch(() => undefined),
  };
};
