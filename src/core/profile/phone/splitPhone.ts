import { type CountryCode, getCountryCallingCode, parsePhoneNumberFromString } from 'libphonenumber-js/mobile';

// A number as we save it ("+994501234567"), or as pasted with its country code ("+994 50 123 45 67"), split into
// its country and the digits after the code. Countries that share a code (+44: the UK, Guernsey, Jersey…) can't
// always be told apart by the number, so `preferred` wins when it has the same code. Null when it can't be read.
export const splitPhone = (
  text: string,
  preferred: CountryCode | null,
): { country: CountryCode; digits: string } | null => {
  const number = parsePhoneNumberFromString(text);

  if (!number?.country) {
    return null;
  }

  const sameCode = preferred && getCountryCallingCode(preferred) === number.countryCallingCode;

  return { country: sameCode ? preferred : number.country, digits: number.nationalNumber };
};
