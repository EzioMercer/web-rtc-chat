import type { CountryCode } from 'libphonenumber-js/mobile';

// A country in the phone number's country list.
export type CountryOption = {
  code: CountryCode;
  // In the user's language, then in English (both are searched).
  name: string;
  englishName: string;
  // With its "+".
  callingCode: string;
};
