import { type CountryCode, AsYouType, getCountryCallingCode } from 'libphonenumber-js/mobile';

// The digits typed after the country code, spaced the way that country writes them ("50 123 45 67"). Typed with
// the leading 0 used inside the country ("050 123 45 67"), they are spaced that way instead.
export const formatPhone = (country: CountryCode, digits: string) => {
  if (!digits) {
    return '';
  }

  if (digits.startsWith('0')) {
    return new AsYouType(country).input(digits);
  }

  const code = `+${getCountryCallingCode(country)}`;
  const spaced = new AsYouType(country).input(`${code}${digits}`);

  return spaced.startsWith(`${code} `) ? spaced.slice(code.length + 1) : digits;
};
