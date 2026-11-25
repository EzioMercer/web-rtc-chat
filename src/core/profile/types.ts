// Our phone number, description and birthday, sent together (see ProfileSignal). Empty strings for none.
export type ProfileInfo = {
  // International format, digits only: "+994501234567".
  phone: string;
  about: string;
  // "2001-02-28", or "--02-28" without the year (see isBirthday).
  birthday: string;
};
