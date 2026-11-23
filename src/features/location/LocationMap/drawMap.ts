// A made-up street map, drawn the same every time for the same seed: no map pictures are loaded from anywhere (see
// README, privacy). Coordinates are in the map's 300 x 160 box; the city is drawn bigger and turned, so it fills
// the box at any angle.

export type MapBlock = { x: number; y: number; w: number; h: number; park: boolean; alt: boolean };

export type MapDrawing = {
  angle: number;
  blocks: MapBlock[];
  roads: string[];
  water: string | null;
};

// A small, fast random number generator (mulberry32), started from the seed's hash.
const random = (seed: string) => {
  let state = [...seed].reduce((hash, char) => Math.imul(hash ^ char.charCodeAt(0), 16777619), 2166136261);

  return () => {
    state = (state + 0x6d2b79f5) | 0;

    let t = Math.imul(state ^ (state >>> 15), 1 | state);

    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;

    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

// The pin stands in the middle; parks and water keep away from it, so it never stands in a lake.
const CENTER = { x: 150, y: 80 };
const STREET = 6;

export const drawMap = (seed: string): MapDrawing => {
  const next = random(seed);

  const between = (min: number, max: number) => min + next() * (max - min);

  const angle = between(-28, 28);
  const width = between(34, 46);
  const height = between(26, 36);
  const offsetX = between(0, width);
  const offsetY = between(0, height);

  const blocks: MapBlock[] = [];
  const columns: number[] = [];
  const rows: number[] = [];

  for (let x = -170 + offsetX; x < 470; x += width) {
    columns.push(x);
  }

  for (let y = -170 + offsetY; y < 330; y += height) {
    rows.push(y);
  }

  rows.forEach((y) => {
    columns.forEach((x) => {
      const near = Math.hypot(x + width / 2 - CENTER.x, y + height / 2 - CENTER.y) < 60;

      // Some blocks are split in two by a small lane.
      if (next() < 0.22) {
        const half = (width - STREET) / 2 - 1;

        blocks.push({ x, y, w: half, h: height - STREET, park: false, alt: next() < 0.4 });
        blocks.push({ x: x + half + 2, y, w: half, h: height - STREET, park: false, alt: next() < 0.4 });

        return;
      }

      blocks.push({ x, y, w: width - STREET, h: height - STREET, park: !near && next() < 0.09, alt: next() < 0.35 });
    });
  });

  // Two main roads cross near the pin, and sometimes an avenue runs across at a slant.
  const mainX = columns[Math.floor(columns.length / 2) + (next() < 0.5 ? -1 : 1)] - STREET / 2;
  const mainY = rows[Math.floor(rows.length / 2) + (next() < 0.5 ? -1 : 0)] - STREET / 2;
  const roads = [`M${mainX} -200V400`, `M-200 ${mainY}H500`];

  if (next() < 0.6) {
    const tilt = between(-0.6, 0.6);

    roads.push(`M-200 ${CENTER.y + 200 * tilt + between(-50, 50)}L500 ${CENTER.y - 350 * tilt + between(-50, 50)}`);
  }

  // A river along one side of the box, now and then.
  let water: string | null = null;

  if (next() < 0.5) {
    const side = next() < 0.5 ? -1 : 1;
    const y = CENTER.y + side * between(60, 78);
    const bend = between(-40, 40);

    water = `M-200 ${y}C0 ${y + bend} 300 ${y - bend} 500 ${y}`;
  }

  return { angle, blocks, roads, water };
};
