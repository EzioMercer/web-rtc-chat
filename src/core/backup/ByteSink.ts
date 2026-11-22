// Where a backup is written to, piece by piece. `write` resolves when the sink is ready for more.
export type ByteSink = {
  write: (bytes: Uint8Array<ArrayBuffer>) => Promise<void>;
  close: () => Promise<void>;
  // Stops it; what was written so far is left incomplete.
  abort: () => void;
};
