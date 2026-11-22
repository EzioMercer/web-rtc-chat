import { cx } from '../../utils/cx.ts';
import { Icon } from '../Icon/Icon.tsx';
import type { IconName } from '../Icon/paths.ts';
import styles from './IconButton.module.css';
import { IconButtonVariant } from './IconButtonVariant.ts';

type Props = {
  icon: IconName;
  label: string;
  variant?: IconButtonVariant;
  disabled?: boolean;
  onClick: () => void;
};

export const IconButton = ({ icon, label, variant = IconButtonVariant.Plain, disabled, onClick }: Props) => (
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
