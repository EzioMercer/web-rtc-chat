import { EXTENSION } from './config.ts';

const pad = (n: number) => String(n).padStart(2, '0');

// "p2p-chat-2026-11-22_14-30.p2pchat", in local time (no ":" in it: Windows doesn't allow it in file names).
export const backupFileName = (date = new Date()) => `p2p-chat-${date.getFullYear()}-${pad(date.getMonth() + 1)}-`
  + `${pad(date.getDate())}_${pad(date.getHours())}-${pad(date.getMinutes())}.${EXTENSION}`;
