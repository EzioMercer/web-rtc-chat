// What our contacts see of us. Saved encrypted with the contacts (nowhere in Temporary mode), and put in backups.
export type ProfileState = {
  // Our picture as a JPEG data URL (see makePicture), sent to every contact over the direct connection.
  picture: string | null;
  // Our mobile number in international format ("+994501234567"), or '' for none. Sent like the picture.
  phone: string;
  // A few words about ourselves (up to MAX_ABOUT_CHARS, new lines allowed), or '' for none. Sent like the picture.
  about: string;
};
