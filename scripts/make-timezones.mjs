// Writes src/core/profile/phone/TIMEZONE_COUNTRIES.ts from the IANA time zone database: which country each time
// zone (and each old name of one, which some browsers still report) is in. Run it now and then to keep it current:
//   node scripts/make-timezones.mjs
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const SOURCE = 'https://data.iana.org/time-zones/tzdata-latest.tar.gz';
const OUT = 'src/core/profile/phone/TIMEZONE_COUNTRIES.ts';
const dir = mkdtempSync(join(tmpdir(), 'tzdata-'));

try {
  const response = await fetch(SOURCE);

  if (!response.ok) {
    throw new Error(`${SOURCE}: ${response.status}`);
  }

  writeFileSync(join(dir, 'tzdata.tar.gz'), Buffer.from(await response.arrayBuffer()));
  execFileSync('tar', ['xzf', 'tzdata.tar.gz', 'zone.tab', 'backward', 'version'], { cwd: dir });

  const read = name => readFileSync(join(dir, name), 'utf8');

  const country = new Map();

  for (const line of read('zone.tab').split('\n')) {
    const [code, , zone] = line.split('\t');

    if (!line.startsWith('#') && zone) {
      country.set(zone, code);
    }
  }

  for (const line of read('backward').split('\n')) {
    const [word, target, old] = line.split(/\s+/);

    if (word === 'Link' && country.has(target) && !country.has(old)) {
      country.set(old, country.get(target));
    }
  }

  const byCountry = new Map();

  for (const [zone, code] of country) {
    byCountry.set(code, [...byCountry.get(code) ?? [], zone]);
  }

  // One line per country where it fits in 120 columns, otherwise one line per zone below it.
  const lines = [...byCountry].sort(([a], [b]) => a.localeCompare(b)).flatMap(([code, zones]) => {
    const quoted = zones.sort().map(zone => `'${zone}'`);
    const one = `  ${code}: [${quoted.join(', ')}],`;

    if (one.length <= 120) {
      return [one];
    }

    return [`  ${code}: [`, ...quoted.map(zone => `    ${zone},`), '  ],'];
  });

  writeFileSync(OUT, [
    `// The time zones of each country, from the IANA time zone database (tzdata ${read('version').trim()}), with the`,
    '// old names some browsers still report. Made by scripts/make-timezones.mjs: don\'t edit it by hand.',
    'export const TIMEZONE_COUNTRIES: Record<string, string[]> = {',
    ...lines,
    '};',
    '',
  ].join('\n'));
  console.log(`${OUT}: ${country.size} time zones in ${byCountry.size} countries`);
} finally {
  rmSync(dir, { recursive: true, force: true });
}
