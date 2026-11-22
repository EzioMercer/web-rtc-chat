// Messages are saved in pages of this many: a new message rewrites only the last page, so long chats stay fast.
export const PAGE_SIZE = 200;

// Files are saved in pieces of this size, each encrypted on its own, so a big file never has to be in memory twice.
export const FILE_CHUNK = 1024 * 1024;

// A chat is saved this long after its last change, so a burst of changes (typing, a file's progress) is one write.
export const SAVE_DELAY_MS = 300;

// Saved pages say which format they are in (see StoredPage).
export const PAGE_FORMAT = 1;
