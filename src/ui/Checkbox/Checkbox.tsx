import type { ReactNode } from 'react';
import styles from './Checkbox.module.css';

type Props = {
  checked: boolean;
  onChange: (checked: boolean) => void;
  children: ReactNode;
  disabled?: boolean;
};

// A checkbox with its label; the whole label is the touch target.
export const Checkbox = ({ checked, onChange, children, disabled }: Props) => (
  <label className={styles.checkbox}>
    <input type="checkbox" checked={checked} disabled={disabled} onChange={e => onChange(e.target.checked)} />
    <span className={styles.label}>{children}</span>
  </label>
);
