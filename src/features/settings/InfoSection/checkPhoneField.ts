import { validatePhoneNumberLength } from 'libphonenumber-js/mobile';
import { checkPhone } from '../../../core/profile/phone/checkPhone.ts';
import type { CountryOption } from '../../../core/profile/phone/types.ts';

// What the phone number field holds, checked by libphonenumber-js as it is typed: the number to save ('' for none),
// a number not long enough yet (`missing`, said quietly), or one that can't be a mobile number there (`error`).
export type PhoneCheck = { phone: string } | { missing: string } | { error: string };

export const checkPhoneField = (country: CountryOption | null, digits: string): PhoneCheck => {
  if (!digits) {
    return { phone: '' };
  }

  if (!country) {
    return { missing: 'Choose the country of your phone number.' };
  }

  const phone = checkPhone(country.code, digits);

  if (phone) {
    return { phone };
  }

  const where = `${country.name} (${country.callingCode})`;

  return validatePhoneNumberLength(digits, country.code) === 'TOO_SHORT'
    ? { missing: `Type the whole mobile number of ${where}.` }
    : { error: `This isn't a mobile number of ${where}.` };
};
