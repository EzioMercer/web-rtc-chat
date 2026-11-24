import type { CountryCode } from 'libphonenumber-js/mobile';
import * as flags from 'country-flag-icons/string/3x2';

const urls = new Map<string, string>();

// A country's flag (3:2) as an image URL. The flags are drawn pictures, not emoji: Windows shows emoji flags as
// letters.
export const flagUrl = (country: CountryCode) => {
  let url = urls.get(country);

  if (!url) {
    const svg = (flags as Record<string, string | undefined>)[country] ?? '';

    url = `data:image/svg+xml,${encodeURIComponent(svg)}`;
    urls.set(country, url);
  }

  return url;
};
