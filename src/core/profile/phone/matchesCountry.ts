import type { CountryOption } from './types.ts';

// Whether a country fits what was typed in the country list's search: either a name (part of it, in the user's
// language or English, or its letters "AZ") or a code (its start: "+994", "994", "99").
export const matchesCountry = (option: CountryOption, query: string) => {
  const text = query.trim().toLocaleLowerCase();
  const digits = text.replace(/^\+/, '');

  if (/^\d+$/.test(digits)) {
    return option.callingCode.slice(1).startsWith(digits);
  }

  return option.name.toLocaleLowerCase().includes(text)
    || option.englishName.toLocaleLowerCase().includes(text)
    || option.code.toLowerCase() === text;
};
