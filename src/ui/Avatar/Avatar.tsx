import type { ReactNode } from 'react';
import { cx } from '../../utils/cx.ts';
import { Icon } from '../Icon/Icon.tsx';
import styles from './Avatar.module.css';

type Props = {
  // A data URL (see core/profile); without one, the name's first letter, or a person icon.
  picture?: string | null;
  name?: string;
  size: number;
  // Background colour and the like, from the place it is shown in.
  className?: string;
  // Drawn over the edge, e.g. a status dot.
  children?: ReactNode;
};

// A round picture of a person.
export const Avatar = ({ picture, name, size, className, children }: Props) => {
  const letter = name?.trim().charAt(0).toUpperCase();

  return (
    <span className={cx(styles.avatar, className)} style={{ width: size, height: size, fontSize: size * 0.4 }}>
      {picture && <img className={styles.picture} src={picture} alt="" draggable={false} />}
      {!picture && (letter || <Icon name="user" size={Math.round(size / 2)} />)}
      {children}
    </span>
  );
};
