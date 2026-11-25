import { type CountryCode, validatePhoneNumberLength } from 'libphonenumber-js/mobile';
import { MAX_PHONE_DIGITS } from '../config.ts';

// The typed digits cut to the most a mobile number of `country` can have (its leading 0 may be typed or left out),
// so the field stops taking digits once the number is long enough.
export const fitPhone = (country: CountryCode | null, digits: string) => {
  let fitted = digits.slice(0, MAX_PHONE_DIGITS);

  while (country && fitted && validatePhoneNumberLength(fitted, country) === 'TOO_LONG') {
    fitted = fitted.slice(0, -1);
  }

  return fitted;
};
