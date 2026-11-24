import { type CountryCode, getCountries } from 'libphonenumber-js/mobile';
import { TIMEZONE_COUNTRIES } from './TIMEZONE_COUNTRIES.ts';

// The region a language names itself ("AZ" in "ru-AZ"; none in a bare "ru"), if it is a valid language tag.
const regionOf = (language: string) => {
  try {
    return new Intl.Locale(language).region;
  } catch {
    return undefined;
  }
};

// Our country, guessed on the device only (nothing is asked of a server): from its time zone, which names a place
// ("Asia/Baku"), or else from the browser language's region ("ru-AZ"). Null when neither says.
export const guessCountry = (languages: readonly string[]): CountryCode | null => {
  const known = new Set<string>(getCountries());
  const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const candidates = [
    Object.keys(TIMEZONE_COUNTRIES).find(code => TIMEZONE_COUNTRIES[code].includes(zone)),
    ...languages.map(regionOf),
  ];

  return (candidates.find(code => code && known.has(code)) as CountryCode | undefined) ?? null;
};
