import { cx } from '../../utils/cx.ts';
import { Icon } from '../Icon/Icon.tsx';
import type { IconName } from '../Icon/paths.ts';
import styles from './IconButton.module.css';

type Props = {
  icon: IconName;
  label: string;
  variant?: 'plain' | 'neutral' | 'off' | 'danger' | 'success';
  disabled?: boolean;
  onClick: () => void;
};

export const IconButton = ({ icon, label, variant = 'plain', disabled, onClick }: Props) => (
  <button
    className={cx(styles.button, styles[variant])}
    type="button"
    title={label}
    aria-label={label}
    disabled={disabled}
    onClick={onClick}
  >
    <Icon name={icon} />
  </button>
);
