import { useMemo, type ReactNode } from 'react';
import { Avatar } from '../../../ui/Avatar/Avatar.tsx';
import { cx } from '../../../utils/cx.ts';
import { drawMap } from './drawMap.ts';
import styles from './LocationMap.module.css';

type Props = {
  // The same seed draws the same streets (a message's id, so a live one keeps its look while it moves).
  seed: string;
  // A live location: the pin is the person's picture, with a pulse while it runs.
  live?: { picture?: string | null; name?: string; running: boolean };
  // Grey: a live location that ended.
  faded?: boolean;
  // Drawn over the map (badges, a progress bar).
  children?: ReactNode;
};

// A drawn map with a pin in the middle. Its streets are made up (see drawMap): the real place is in the text, and
// "Open in Google Maps" shows it for real.
export const LocationMap = ({ seed, live, faded, children }: Props) => {
  const map = useMemo(() => drawMap(seed), [seed]);

  return (
    <div className={cx(styles.map, faded && styles.faded)}>
      <svg className={styles.svg} viewBox="0 0 300 160" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
        <rect className={styles.street} width="300" height="160" />
        <g transform={`rotate(${map.angle.toFixed(2)} 150 80)`}>
          {map.blocks.map(block => (
            <rect
              key={`${block.x.toFixed(1)},${block.y.toFixed(1)}`}
              className={block.park ? styles.park : cx(styles.block, block.alt && styles.alt)}
              x={block.x.toFixed(1)}
              y={block.y.toFixed(1)}
              width={block.w.toFixed(1)}
              height={block.h.toFixed(1)}
              rx="2.5"
            />
          ))}
          {map.water && <path className={styles.water} d={map.water} />}
          {map.roads.map(road => <path key={road} className={styles.roadEdge} d={road} />)}
          {map.roads.map(road => <path key={road} className={styles.road} d={road} />)}
        </g>
      </svg>
      <span className={styles.vignette} />
      {live
        ? (
            <span className={cx(styles.livePin, live.running && styles.running)}>
              <span className={styles.pulse} />
              <span className={styles.pulse} />
              <Avatar className={styles.face} picture={live.picture} name={live.name} size={34} />
            </span>
          )
        : (
            <span className={styles.pin}>
              <svg viewBox="0 0 32 42" width="30" height="40" aria-hidden="true">
                <path
                  className={styles.pinBody}
                  d="M16 41C16 41 30 26.5 30 15.5A14 14 0 0 0 2 15.5C2 26.5 16 41 16 41Z"
                />
                <circle className={styles.pinDot} cx="16" cy="15.5" r="5.5" />
              </svg>
            </span>
          )}
      {children}
    </div>
  );
};
