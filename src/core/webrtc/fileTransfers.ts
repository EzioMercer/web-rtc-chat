// Files going out or coming in now, by memoryFileKey: how to stop each one (its message was deleted).
export const fileTransfers = new Map<string, () => void>();
