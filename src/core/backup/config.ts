// The first bytes of every backup file: "P2PCHAT" and a zero byte.
export const MAGIC = new Uint8Array([0x50, 0x32, 0x50, 0x43, 0x48, 0x41, 0x54, 0x00]);

// The file layout's version. A newer app reads older layouts it still knows; an older app refuses newer ones.
export const BACKUP_FORMAT = 1;

export const EXTENSION = 'p2pchat';

// The plain header is a few hundred bytes; anything bigger is not a backup.
export const MAX_HEADER_BYTES = 4096;

// The largest record: a file piece, encrypted and maybe zipped (zipping never grows data by much).
export const MAX_RECORD_BYTES = 4 * 1024 * 1024;

// Unzipped, one record holds at most this much (a page of messages is far less); bigger means a damaged file or a
// "zip bomb".
export const MAX_UNZIPPED_BYTES = 64 * 1024 * 1024;

// How often progress is reported to the screen.
export const PROGRESS_MS = 250;

// What a file that wasn't put into the backup says after restoring it.
export const LEFT_OUT = 'Not in the backup (it was made without media).';

export const DAMAGED = 'The backup file is damaged or incomplete.';
