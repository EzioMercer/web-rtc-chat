import { type CountryCode, parsePhoneNumberFromString } from 'libphonenumber-js/mobile';

// The typed number in the form we save and send ("+994501234567"), if it is a mobile number of `country` (or of
// another country with the same code, such as Canada for +1); null if it isn't. The leading 0 used inside a country
// may be typed or left out.
export const checkPhone = (country: CountryCode, digits: string) => {
  const number = parsePhoneNumberFromString(digits, country);

  return number?.isValid() ? number.number : null;
};
