import type { ReactNode } from 'react';
import { cx } from '../../utils/cx.ts';
import styles from './Button.module.css';
import { ButtonType } from './ButtonType.ts';
import { ButtonVariant } from './ButtonVariant.ts';

type Props = {
  children: ReactNode;
  variant?: ButtonVariant;
  type?: ButtonType;
  disabled?: boolean;
  wide?: boolean;
  onClick?: () => void;
};

export const Button = (
  { children, variant = ButtonVariant.Primary, type = ButtonType.Button, disabled, wide, onClick }: Props,
) => (
  <button
    className={cx(styles.button, styles[variant], wide && styles.wide)}
    type={type}
    disabled={disabled}
    onClick={onClick}
  >
    {children}
  </button>
);
