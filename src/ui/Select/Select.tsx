import { cx } from '../../utils/cx.ts';
import { Icon } from '../Icon/Icon.tsx';
import styles from './Select.module.css';

type Option = {
  value: string;
  label: string;
};

type Props = {
  // Read by screen readers; the field itself shows only the choice (or `placeholder`).
  label: string;
  value: string;
  options: Option[];
  onChange: (value: string) => void;
  // Shown while nothing is chosen (value ''); it can be chosen again to clear the field.
  placeholder?: string;
  className?: string;
};

// A list to choose from: the browser's own (a wheel or sheet on phones), drawn like our other fields, with the same
// chevron as the phone number's country button.
export const Select = ({ label, value, options, onChange, placeholder, className }: Props) => (
  <span className={cx(styles.wrap, className)}>
    <select
      className={cx(styles.select, value === '' && styles.empty)}
      aria-label={label}
      value={value}
      onChange={e => onChange(e.target.value)}
    >
      {placeholder !== undefined && <option value="">{placeholder}</option>}
      {options.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
    </select>
    <span className={styles.chevron}><Icon name="chevronDown" size={16} /></span>
  </span>
);
