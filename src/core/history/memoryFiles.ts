// Files of this session (sent, received or opened), by memoryFileKey. They are what an export reads for a
// temporary identity, and what is saved once a transfer completes.
export const memoryFiles = new Map<string, Blob>();
