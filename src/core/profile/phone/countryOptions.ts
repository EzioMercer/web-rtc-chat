import { type CountryCode, getCountries, getCountryCallingCode } from 'libphonenumber-js/mobile';
import type { CountryOption } from './types.ts';

// Every country with a phone code, named in `languages` (the browser's now; the app's own language once it has one)
// and in English for searching, sorted by name.
export const countryOptions = (languages: readonly string[]): CountryOption[] => {
  const local = new Intl.DisplayNames([...languages], { type: 'region', fallback: 'code' });
  const english = new Intl.DisplayNames(['en'], { type: 'region', fallback: 'code' });
  const collator = new Intl.Collator([...languages]);

  return getCountries()
    .map((code: CountryCode) => ({
      code,
      name: local.of(code) ?? code,
      englishName: english.of(code) ?? code,
      callingCode: `+${getCountryCallingCode(code)}`,
    }))
    .sort((a, b) => collator.compare(a.name, b.name));
};
