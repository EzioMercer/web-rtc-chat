// What our contacts see of us. Saved encrypted with the contacts (nowhere in Temporary mode), and put in backups.
export type ProfileState = {
  // Our picture as a JPEG data URL (see makePicture), sent to every contact over the direct connection.
  picture: string | null;
};
