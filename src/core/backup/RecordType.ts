// What a backup record holds (see writeBackup for their order). Saved as numbers: never change a value; add new
// ones at the end.
export enum RecordType {
  // What the backup contains (BackupInfo).
  Info = 1,
  // One contact and our key for them (ContactRecord).
  Contact = 2,
  // Up to a page of one chat's messages (PageRecord).
  Page = 3,
  // A file's content follows in Chunk records (FileRecord).
  File = 4,
  // A piece of the file announced last, as it is.
  Chunk = 5,
  // A piece of the file announced last, zipped.
  ZippedChunk = 6,
  // The last record: without it the file is incomplete.
  End = 7,
}
