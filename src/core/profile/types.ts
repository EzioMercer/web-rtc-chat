// Our phone number and description, sent together (see ProfileSignal). Empty strings for none.
export type ProfileInfo = {
  // International format, digits only: "+994501234567".
  phone: string;
  about: string;
};
