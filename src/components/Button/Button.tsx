import type { ReactNode } from 'react';
import { cx } from '../../utils/cx.ts';
import styles from './Button.module.css';

type Props = {
  children: ReactNode;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  type?: 'button' | 'submit';
  disabled?: boolean;
  wide?: boolean;
  onClick?: () => void;
};

export const Button = ({ children, variant = 'primary', type = 'button', disabled, wide, onClick }: Props) => (
  <button
    className={cx(styles.button, styles[variant], wide && styles.wide)}
    type={type}
    disabled={disabled}
    onClick={onClick}
  >
    {children}
  </button>
);
